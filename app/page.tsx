'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { nanoid } from 'nanoid';
import type { Tab, Contact, ActiveFilter, SortOrder, AppSettings, UserProfile, InteractionType } from '@/lib/types';
import { initDB, getAllContacts, getContact as dbGetContact, saveContact, deleteContact as dbDelete, getAppSettings, saveAppSettings, getUserProfile, saveUserProfile, setDBUser } from '@/lib/db';
import { auth, onAuthStateChanged, logoutUser, type User } from '@/lib/firebase';
import BottomNav from '@/components/BottomNav';
import ContactList from '@/components/ContactList';
import ContactDetail from '@/components/ContactDetail';
import ContactForm from '@/components/ContactForm';
import NetworkView from '@/components/NetworkView';
import Settings from '@/components/Settings';
import Toast from '@/components/Toast';
import AuthScreen from '@/components/AuthScreen';
import Onboarding from '@/components/Onboarding';
import BirthdayBanner from '@/components/BirthdayBanner';
import ReconnectBanner from '@/components/ReconnectBanner';
import PlannedBanner from '@/components/PlannedBanner';
import BulkImport from '@/components/BulkImport';
import SyncIndicator, { type SyncStatus } from '@/components/SyncIndicator';
import { fullSync, forceUploadAll, syncToCloud, savePlannedNotification, completePlannedNotification, syncEmailPreference, syncProfileToCloud, pullProfileFromCloud, storePushSubscription } from '@/lib/sync';
import { decodeSharedContact } from '@/lib/share';
import type { NetworkFilterAction } from '@/components/NetworkView';

/** Schedule a local notification for a future date using setTimeout.
 *  Falls back gracefully if notifications aren't supported or permitted. */
function scheduleNotification(contactName: string, description: string, dateStr: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const target = new Date(dateStr + 'T09:00:00').getTime();
  const delay = target - Date.now();
  if (delay > 0 && delay < 2_147_483_647) {
    // Schedule for the day of the interaction
    setTimeout(() => {
      new Notification(`InTouch — ${contactName}`, {
        body: `Reminder: ${description} today`,
        icon: '/icons/icon-192.svg',
      });
    }, delay);
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Screen =
  | { type: 'list' }
  | { type: 'detail'; contact: Contact }
  | { type: 'form'; contact: Contact | null };

type AppState = 'loading' | 'auth' | 'onboarding' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('contacts');
  const [screen, setScreen] = useState<Screen>({ type: 'list' });
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [birthdayDismissed, setBirthdayDismissed] = useState(false);
  const [reconnectDismissed, setReconnectDismissed] = useState(false);
  const [plannedDismissed, setPlannedDismissed] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    reconnectRemindersEnabled: true,
    cloudSyncEnabled: true, // default ON — new devices pull from Firestore on first login
    sortOrder: 'name',
    emailNotificationsEnabled: true,
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '', photoUrl: '', phone: '', email: '', linkedinUrl: '',
    birthday: '', mainLocation: '', education: [], jobs: [],
    sharePhone: false, shareEmail: false, shareLinkedin: false,
    shareBirthday: false, shareLocation: false, shareEducation: false, shareJobs: false,
  });

  // Lifted filter state so NetworkView can set it
  const [filter, setFilter] = useState<ActiveFilter>({
    classification: 'all',
    tags: [],
    search: '',
    homeLocation: null,
    university: null,
    company: null,
    role: null,
    hasUpcomingPlan: false,
    hasInteractions: false,
  });

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Always clear in-memory data first to prevent cross-account leaks
      setContacts([]);
      setUserProfile({
        name: '', photoUrl: '', phone: '', email: '', linkedinUrl: '',
        birthday: '', mainLocation: '', education: [], jobs: [],
        sharePhone: false, shareEmail: false, shareLinkedin: false,
        shareBirthday: false, shareLocation: false, shareEducation: false, shareJobs: false,
      });
      // Switch to user-scoped IndexedDB before loading any data
      setDBUser(firebaseUser?.uid ?? null);
      setUser(firebaseUser);
      if (firebaseUser) {
        const onboarded = localStorage.getItem(`intouch-onboarded-${firebaseUser.uid}`);
        setAppState(onboarded ? 'app' : 'onboarding');
      } else {
        setAppState('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  // Capture PWA install prompt before browser discards it
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Load theme + data + cloud sync when we enter app state or when user changes.
  // Cloud sync is intentionally inside this same effect so it runs AFTER settings
  // are loaded from IndexedDB (prevents the race condition where cloudSyncEnabled
  // is still false when the sync effect fires).
  useEffect(() => {
    if (appState !== 'app' && appState !== 'onboarding') return;
    if (!user) return;
    let cancelled = false;

    try {
      const savedTheme = localStorage.getItem('intouch-theme');
      if (savedTheme === 'dark') setIsDark(true);
    } catch {}

    (async () => {
      try {
        await initDB();
        const [all, settings, profile] = await Promise.all([getAllContacts(), getAppSettings(), getUserProfile()]);
        if (cancelled) return;
        setAppSettings(settings);
        setUserProfile(profile);
        // Show IndexedDB contacts immediately so the UI is never blank while sync runs
        setContacts(all);

        // Cloud sync: pull from Firestore and merge with local data.
        // This runs after settings are loaded so we can check the real cloudSyncEnabled value.
        if (settings.cloudSyncEnabled) {
          setSyncStatus('syncing');
          try {
            const [merged, cloudProfile] = await Promise.all([
              fullSync(user.uid),
              pullProfileFromCloud(user.uid),
            ]);
            if (!cancelled) {
              setContacts(merged);
              if (cloudProfile) {
                // Cloud profile exists — merge it in (cloud wins, local photo kept)
                const mergedProfile = { ...profile, ...cloudProfile, photoUrl: profile.photoUrl };
                setUserProfile(mergedProfile);
                await saveUserProfile(mergedProfile);
              } else if (profile.name) {
                // Nothing in Firestore yet (e.g. first sync or offline edits) —
                // push local profile so it's never lost if the device is replaced
                syncProfileToCloud(user.uid, profile).catch(() => {});
              }
              setSyncStatus('idle');
            }
          } catch (e) {
            console.error('Sync error:', e);
            if (!cancelled) {
              setContacts(all);
              setSyncStatus('error');
            }
          }
        } else {
          setContacts(all);
        }
      } catch (e) {
        console.error('Init error:', e);
      }
    })();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => { cancelled = true; };
  }, [appState, user]);

  // Re-sync when iOS PWA comes back to the foreground (visibility change)
  // This handles the case where Firebase auth token was refreshed in the background
  // and the contacts/sync state is stale.
  useEffect(() => {
    if (appState !== 'app' || !user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = async () => {
      if (document.hidden) return;
      // Small delay to let Firebase finish re-authenticating after iOS resume
      timer = setTimeout(async () => {
        try {
          const settings = await getAppSettings();
          if (!settings.cloudSyncEnabled) return;
          setSyncStatus('syncing');
          const merged = await fullSync(user.uid);
          setContacts(merged);
          setSyncStatus('idle');
        } catch {
          setSyncStatus('error');
        }
      }, 1500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timer) clearTimeout(timer);
    };
  }, [appState, user]);

  // Handle ?import= URL param for shared contacts
  useEffect(() => {
    if (appState !== 'app') return;
    const params = new URLSearchParams(window.location.search);
    const importParam = params.get('import');
    if (!importParam) return;

    const shared = decodeSharedContact(importParam);
    if (shared) {
      const prefilled = {
        ...shared,
        id: '',
        classification: 'wider' as const,
        howMet: '', whereMet: '', eventOrContext: '', dateMet: '',
        nationality: '', notes: '', birthday: '',
        tags: [] as string[],
        reconnectIntervalWeeks: null,
        lastContacted: '',
        interactions: [] as Contact['interactions'],
        dateAdded: '',
        lastUpdated: '',
      } as Contact;
      setScreen({ type: 'form', contact: prefilled });
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, [appState]);

  const refresh = useCallback(async () => {
    const all = await getAllContacts();
    setContacts(all);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((d) => {
      const next = !d;
      localStorage.setItem('intouch-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const handleSave = useCallback(
    async (contact: Contact) => {
      await saveContact(contact);
      if (appSettings.cloudSyncEnabled && user) {
        syncToCloud(user.uid, contact).catch((e) => {
          console.error('Cloud sync error:', e);
          setSyncStatus('error');
        });
      }
      await refresh();
      setScreen({ type: 'list' });
      showToast(contact.dateAdded === contact.lastUpdated ? 'Contact added' : 'Contact updated');
    },
    [refresh, showToast, appSettings.cloudSyncEnabled, user]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      // Read fresh from IndexedDB (avoids stale-closure issues with contacts state).
      // Soft-delete: stamp deleted:true + fresh lastUpdated so the sync merge always
      // picks this version over any older copy in Firestore.
      const contact = await dbGetContact(id);
      if (contact) {
        const tombstone = { ...contact, deleted: true as const, lastUpdated: new Date().toISOString() };
        await saveContact(tombstone);
        if (appSettings.cloudSyncEnabled && user) {
          syncToCloud(user.uid, tombstone).catch((e) => {
            console.error('Cloud delete error:', e);
          });
        }
      } else {
        await dbDelete(id);
      }
      await refresh();
      setScreen({ type: 'list' });
      showToast('Contact deleted');
    },
    [refresh, showToast, appSettings.cloudSyncEnabled, user]
  );

  const handleLogInteraction = useCallback(
    async (contactId: string, date: string, note: string, type?: InteractionType, duration?: string, initiator?: 'you' | 'them') => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const updated: Contact = {
        ...contact,
        interactions: [
          ...contact.interactions,
          { id: nanoid(), date, note, type, duration, initiator },
        ],
        lastContacted: date,
        lastUpdated: new Date().toISOString(),
      };
      await saveContact(updated);
      await refresh();
      // Update detail view if we're looking at this contact
      setScreen((prev) =>
        prev.type === 'detail' && prev.contact.id === contactId
          ? { type: 'detail', contact: updated }
          : prev
      );
    },
    [contacts, refresh]
  );

  const handleDeleteInteraction = useCallback(
    async (contactId: string, interactionId: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const updated: Contact = {
        ...contact,
        interactions: contact.interactions.filter((i) => i.id !== interactionId),
        lastUpdated: new Date().toISOString(),
      };
      await saveContact(updated);
      await refresh();
      setScreen((prev) =>
        prev.type === 'detail' && prev.contact.id === contactId
          ? { type: 'detail', contact: updated }
          : prev
      );
    },
    [contacts, refresh]
  );

  const handleMarkContacted = useCallback(
    async (contactId: string) => {
      const today = new Date().toISOString().slice(0, 10);
      // Clear one-off reconnectDate when marking as contacted
      const contact = contacts.find((c) => c.id === contactId);
      if (contact?.reconnectDate) {
        const updated = { ...contact, reconnectDate: '', lastUpdated: new Date().toISOString() };
        await saveContact(updated);
      }
      await handleLogInteraction(contactId, today, 'Reconnected');
    },
    [contacts, handleLogInteraction]
  );

  const handleSettingsChange = useCallback(
    async (newSettings: AppSettings) => {
      setAppSettings(newSettings);
      await saveAppSettings(newSettings);
      // Sync email preference to Firestore so the cron job can read it
      if (user && newSettings.emailNotificationsEnabled !== appSettings.emailNotificationsEnabled) {
        syncEmailPreference(user.uid, newSettings.emailNotificationsEnabled).catch(() => {});
      }
    },
    [user, appSettings.emailNotificationsEnabled]
  );

  const handleProfileChange = useCallback(
    async (newProfile: UserProfile) => {
      setUserProfile(newProfile);
      await saveUserProfile(newProfile);
      if (user && appSettings.cloudSyncEnabled) {
        syncProfileToCloud(user.uid, newProfile).catch(() => {});
      }
    },
    [user, appSettings.cloudSyncEnabled]
  );

  // Force-upload all local contacts + profile to Firestore, then pull back (bidirectional sync)
  const handleForceSync = useCallback(async () => {
    if (!user) throw new Error('Not logged in');
    setSyncStatus('syncing');
    try {
      await Promise.all([
        forceUploadAll(user.uid, contacts),
        syncProfileToCloud(user.uid, userProfile),
      ]);
      const [merged, cloudProfile] = await Promise.all([
        fullSync(user.uid),
        pullProfileFromCloud(user.uid),
      ]);
      setContacts(merged);
      if (cloudProfile) {
        const mergedProfile = { ...userProfile, ...cloudProfile, photoUrl: userProfile.photoUrl };
        setUserProfile(mergedProfile);
        await saveUserProfile(mergedProfile);
      }
      setSyncStatus('idle');
    } catch (e) {
      setSyncStatus('error');
      throw e;
    }
  }, [user, contacts, userProfile]);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    setContacts([]);
    setTab('contacts');
    setScreen({ type: 'list' });
  }, []);

  const allUsedTags = useMemo(() => {
    const tags = new Set<string>();
    for (const c of contacts) {
      for (const t of c.tags) tags.add(t);
    }
    return [...tags].sort();
  }, [contacts]);

  // Suggestion pools for auto-suggest inputs
  const suggestionPools = useMemo(() => {
    const collect = (extractor: (c: Contact) => string) => {
      const set = new Set<string>();
      for (const c of contacts) {
        const v = extractor(c).trim();
        if (v) set.add(v);
      }
      return [...set].sort();
    };
    // Collect from nested education entries
    const collectEdu = (extractor: (e: { university: string; program: string; gradYear: string }) => string) => {
      const set = new Set<string>();
      for (const c of contacts) {
        for (const edu of c.education || []) {
          const v = extractor(edu).trim();
          if (v) set.add(v);
        }
      }
      return [...set].sort();
    };
    return {
      role: collect((c) => c.role),
      company: collect((c) => c.company),
      university: [...new Set([...collect((c) => c.university), ...collectEdu((e) => e.university)])].sort(),
      program: collectEdu((e) => e.program),
      gradYear: collectEdu((e) => e.gradYear),
      homeLocation: collect((c) => c.homeLocation),
      howMet: collect((c) => c.howMet),
      whereMet: collect((c) => c.whereMet),
      eventOrContext: collect((c) => c.eventOrContext),
    };
  }, [contacts]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setScreen({ type: 'list' });
  };

  const handleNetworkFilter = useCallback((action: NetworkFilterAction) => {
    const base: ActiveFilter = {
      classification: 'all',
      tags: [],
      search: '',
      homeLocation: null,
      university: null,
      company: null,
      role: null,
      hasUpcomingPlan: false,
      hasInteractions: false,
    };
    if (action.field === 'homeLocation') base.homeLocation = action.value;
    else if (action.field === 'university') base.university = action.value;
    else if (action.field === 'company') base.company = action.value;
    else if (action.field === 'role') base.role = action.value;
    else if (action.field === 'tag') base.tags = [action.value];
    else base.search = action.value;
    setFilter(base);
    setTab('contacts');
    setScreen({ type: 'list' });
  }, []);

  const handleAddPlanned = useCallback(
    async (contactId: string, date: string, description: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const planned = {
        id: nanoid(),
        date,
        description,
        completed: false,
        outcomeLogged: false,
      };
      const updated: Contact = {
        ...contact,
        plannedInteractions: [...(contact.plannedInteractions || []), planned],
        lastUpdated: new Date().toISOString(),
      };
      await saveContact(updated);
      await refresh();
      setScreen((prev) =>
        prev.type === 'detail' && prev.contact.id === contactId
          ? { type: 'detail', contact: updated }
          : prev
      );
      showToast('Interaction planned');
      // Schedule a local notification for the planned date
      scheduleNotification(contact.name, description, date);
      // Write to Firestore for email reminder (if user has opted in and is logged in)
      if (user?.email && appSettings.emailNotificationsEnabled) {
        savePlannedNotification(user.uid, user.email, contact.name, planned).catch(() => {});
      }
    },
    [contacts, refresh, showToast, user, appSettings.emailNotificationsEnabled]
  );

  const handleCompletePlanned = useCallback(
    async (contactId: string, plannedId: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const planned = (contact.plannedInteractions || []).find((p) => p.id === plannedId);
      const today = new Date().toISOString().slice(0, 10);
      const updated: Contact = {
        ...contact,
        plannedInteractions: (contact.plannedInteractions || []).map((p) =>
          p.id === plannedId ? { ...p, completed: true, outcomeLogged: true } : p
        ),
        interactions: [
          ...contact.interactions,
          { id: nanoid(), date: today, note: planned ? `Planned: ${planned.description}` : 'Planned interaction' },
        ],
        lastContacted: today,
        lastUpdated: new Date().toISOString(),
      };
      await saveContact(updated);
      await refresh();
      setScreen((prev) =>
        prev.type === 'detail' && prev.contact.id === contactId
          ? { type: 'detail', contact: updated }
          : prev
      );
      // Mark the Firestore notification as complete so no more emails are sent
      if (user) {
        completePlannedNotification(user.uid, plannedId).catch(() => {});
      }
      showToast('Logged & completed');
    },
    [contacts, refresh, showToast]
  );

  // Subscribe to native Web Push once permission is granted.
  // No firebase/messaging import — uses PushManager directly via lib/messaging.ts.
  useEffect(() => {
    if (appState !== 'app') return;
    if (!user) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!('PushManager' in window)) return;
    const uid = user.uid;
    import('@/lib/messaging').then(async (mod) => {
      try {
        const sub = await mod.subscribeToPush();
        if (sub) storePushSubscription(uid, sub).catch(() => {});
      } catch { /* non-fatal */ }
    }).catch(() => {});
  }, [appState, user]);

  // Listen for push messages forwarded from the service worker (foreground toasts)
  useEffect(() => {
    if (appState !== 'app' && appState !== 'onboarding') return;
    if (!('serviceWorker' in navigator)) return;
    let unsub: (() => void) | undefined;
    import('@/lib/messaging').then((mod) => {
      unsub = mod.onForegroundMessage((payload) => {
        const title = payload.notification?.title ?? 'InTouch';
        const body = payload.notification?.body ?? '';
        showToast(`${title}: ${body}`);
      });
    }).catch(() => {});
    return () => unsub?.();
  }, [appState, showToast]);

  // Fire local notifications for due items (planned, birthdays, reconnects)
  useEffect(() => {
    if (appState !== 'app') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const today = new Date().toISOString().slice(0, 10);
    const mmdd = today.slice(5); // MM-DD
    const notifiedKey = `intouch-notified-${today}`;
    const alreadyNotified = sessionStorage.getItem(notifiedKey);
    if (alreadyNotified) return;

    const notifications: string[] = [];

    // Planned interactions due
    const due = contacts.flatMap((c) =>
      (c.plannedInteractions || [])
        .filter((p) => !p.completed && p.date <= today)
        .map((p) => `${c.name}: ${p.description}`)
    );
    if (due.length > 0) {
      notifications.push(
        due.length === 1
          ? `Planned: ${due[0]}`
          : `${due.length} planned interactions due`
      );
    }

    // Birthdays today
    const bdays = contacts.filter((c) => c.birthday && c.birthday.slice(5) === mmdd);
    if (bdays.length > 0) {
      notifications.push(
        bdays.length === 1
          ? `🎂 ${bdays[0].name}'s birthday!`
          : `🎂 ${bdays.length} birthdays today!`
      );
    }

    // Reconnect reminders
    const reconnects = contacts.filter((c) => {
      if (c.reconnectDate && c.reconnectDate <= today) return true;
      if (!c.reconnectIntervalWeeks) return false;
      const intervalMs = c.reconnectIntervalWeeks * 7 * 24 * 60 * 60 * 1000;
      const lastDate = c.lastContacted ? new Date(c.lastContacted).getTime() : 0;
      return Date.now() - lastDate > intervalMs;
    });
    if (reconnects.length > 0) {
      notifications.push(`${reconnects.length} reconnect reminder${reconnects.length > 1 ? 's' : ''}`);
    }

    if (notifications.length > 0) {
      new Notification('InTouch', {
        body: notifications.join('\n'),
        icon: '/icons/icon-192.svg',
      });
      sessionStorage.setItem(notifiedKey, '1');
    }
  }, [appState, contacts]);

  const handleEnableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      if (!('Notification' in window)) return false;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
      if (!('PushManager' in window)) return true; // Permission granted, push not available (e.g. iOS non-PWA)
      const mod = await import('@/lib/messaging');
      const sub = await mod.subscribeToPush();
      if (sub && user) await storePushSubscription(user.uid, sub);
      return true; // Permission was granted (push sub is bonus)
    } catch { return false; }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) localStorage.setItem(`intouch-onboarded-${user.uid}`, 'true');
    setAppState('app');
  };

  // ── Loading splash ──
  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg">
        <p className="font-[family-name:var(--font-outfit)] text-zinc-900 text-2xl font-bold tracking-tight">
          InTouch
        </p>
      </div>
    );
  }

  // ── Auth screen ──
  if (appState === 'auth') {
    return <AuthScreen isDark={isDark} />;
  }

  // ── Onboarding ──
  if (appState === 'onboarding') {
    return (
      <Onboarding
        onComplete={handleOnboardingComplete}
        isDark={isDark}
        installPrompt={installPrompt}
        onInstall={() => setInstallPrompt(null)}
        onEnableNotifications={handleEnableNotifications}
      />
    );
  }

  // ── Main app ──
  const themeClass = isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-zinc-900 light';

  return (
    <div className={`min-h-screen ${themeClass}`}>
      <div className="mx-auto max-w-[480px] pb-20 min-h-screen">
        <AnimatePresence mode="wait">
          {tab === 'contacts' && (
            <motion.div
              key={screen.type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {screen.type === 'list' && (
                <>
                  <PlannedBanner
                    contacts={contacts}
                    dismissed={plannedDismissed}
                    onDismiss={() => setPlannedDismissed(true)}
                    onSelect={(c) => setScreen({ type: 'detail', contact: c })}
                    onComplete={(contactId, plannedId) => handleCompletePlanned(contactId, plannedId)}
                    isDark={isDark}
                  />
                  <BirthdayBanner
                    contacts={contacts}
                    dismissed={birthdayDismissed}
                    onDismiss={() => setBirthdayDismissed(true)}
                    onSelect={(c) => setScreen({ type: 'detail', contact: c })}
                    isDark={isDark}
                  />
                  <ReconnectBanner
                    contacts={contacts}
                    enabled={appSettings.reconnectRemindersEnabled}
                    dismissed={reconnectDismissed}
                    onDismiss={() => setReconnectDismissed(true)}
                    onSelect={(c) => setScreen({ type: 'detail', contact: c })}
                    onMarkContacted={handleMarkContacted}
                    isDark={isDark}
                  />
                  <ContactList
                    contacts={contacts}
                    filter={filter}
                    onFilterChange={setFilter}
                    onSelect={(c) => setScreen({ type: 'detail', contact: c })}
                    onAdd={() => setScreen({ type: 'form', contact: null })}
                    sortOrder={appSettings.sortOrder}
                    onSortChange={(sort) => handleSettingsChange({ ...appSettings, sortOrder: sort })}
                    syncStatus={appSettings.cloudSyncEnabled ? syncStatus : undefined}
                    isDark={isDark}
                  />
                </>
              )}
              {screen.type === 'detail' && (
                <ContactDetail
                  contact={screen.contact}
                  onBack={() => setScreen({ type: 'list' })}
                  onEdit={() => setScreen({ type: 'form', contact: screen.contact })}
                  onDelete={() => handleDelete(screen.contact.id)}
                  onLogInteraction={(date, note, type, duration, initiator) => handleLogInteraction(screen.contact.id, date, note, type, duration, initiator)}
                  onDeleteInteraction={(interactionId) => handleDeleteInteraction(screen.contact.id, interactionId)}
                  onAddPlanned={(date, desc) => handleAddPlanned(screen.contact.id, date, desc)}
                  onCompletePlanned={(plannedId) => handleCompletePlanned(screen.contact.id, plannedId)}
                  isDark={isDark}
                />
              )}
              {screen.type === 'form' && (
                <ContactForm
                  contact={screen.contact}
                  allUsedTags={allUsedTags}
                  suggestionPools={suggestionPools}
                  onSave={handleSave}
                  onCancel={() =>
                    setScreen(
                      screen.contact
                        ? { type: 'detail', contact: screen.contact }
                        : { type: 'list' }
                    )
                  }
                  isDark={isDark}
                />
              )}
            </motion.div>
          )}

          {tab === 'network' && (
            <NetworkView
              contacts={contacts}
              onFilter={handleNetworkFilter}
              isDark={isDark}
            />
          )}

          {tab === 'settings' && !showBulkImport && (
            <Settings
              isDark={isDark}
              onToggleTheme={toggleTheme}
              onImportComplete={refresh}
              onBulkImport={() => setShowBulkImport(true)}
              onClearComplete={refresh}
              showToast={showToast}
              onLogout={handleLogout}
              userEmail={user?.email ?? undefined}
              appSettings={appSettings}
              onSettingsChange={handleSettingsChange}
              userProfile={userProfile}
              onProfileChange={handleProfileChange}
              onForceSync={handleForceSync}
              onEnableNotifications={handleEnableNotifications}
            />
          )}

          {tab === 'settings' && showBulkImport && (
            <BulkImport
              existingContacts={contacts}
              onComplete={async (count) => {
                setShowBulkImport(false);
                await refresh();
                showToast(`${count} contact${count !== 1 ? 's' : ''} imported`);
              }}
              onCancel={() => setShowBulkImport(false)}
              isDark={isDark}
            />
          )}
        </AnimatePresence>
      </div>

      <BottomNav active={tab} onChange={handleTabChange} isDark={isDark} />
      <Toast message={toast ?? ''} visible={!!toast} />
    </div>
  );
}
