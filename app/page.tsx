'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { nanoid } from 'nanoid';
import type { Tab, Contact, ActiveFilter, SortOrder, AppSettings, UserProfile } from '@/lib/types';
import { initDB, getAllContacts, saveContact, deleteContact as dbDelete, getAppSettings, saveAppSettings, getUserProfile, saveUserProfile, setDBUser } from '@/lib/db';
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
import SyncIndicator, { type SyncStatus } from '@/components/SyncIndicator';
import { fullSync, syncToCloud, deleteFromCloud } from '@/lib/sync';
import { decodeSharedContact } from '@/lib/share';

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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [birthdayDismissed, setBirthdayDismissed] = useState(false);
  const [reconnectDismissed, setReconnectDismissed] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    reconnectRemindersEnabled: true,
    cloudSyncEnabled: false,
    sortOrder: 'name',
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '', photoUrl: '', phone: '', email: '', linkedinUrl: '',
    birthday: '', mainLocation: '', education: [], jobs: [],
    sharePhone: false, shareEmail: false, shareLinkedin: false,
    shareBirthday: false, shareLocation: false, shareEducation: false, shareJobs: false,
  });

  // Lifted filter state so NetworkView can set it
  const [filter, setFilter] = useState<ActiveFilter>({
    classification: 'all',
    tag: null,
    search: '',
  });

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Switch to user-scoped IndexedDB before loading any data
      setDBUser(firebaseUser?.uid ?? null);
      setUser(firebaseUser);
      if (firebaseUser) {
        const onboarded = localStorage.getItem(`intouch-onboarded-${firebaseUser.uid}`);
        setAppState(onboarded ? 'app' : 'onboarding');
      } else {
        // Clear in-memory state on logout
        setContacts([]);
        setAppState('auth');
      }
    });
    return () => unsubscribe();
  }, []);

  // Load theme + data when we enter app state
  useEffect(() => {
    if (appState !== 'app' && appState !== 'onboarding') return;

    try {
      const savedTheme = localStorage.getItem('intouch-theme');
      if (savedTheme === 'dark') setIsDark(true);
    } catch {}

    (async () => {
      try {
        await initDB();
        const [all, settings, profile] = await Promise.all([getAllContacts(), getAppSettings(), getUserProfile()]);
        setContacts(all);
        setAppSettings(settings);
        setUserProfile(profile);
      } catch (e) {
        console.error('Init error:', e);
      }
    })();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, [appState]);

  // Handle ?import= URL param for shared contacts
  useEffect(() => {
    if (appState !== 'app') return;
    const params = new URLSearchParams(window.location.search);
    const importParam = params.get('import');
    if (!importParam) return;

    const shared = decodeSharedContact(importParam);
    if (shared) {
      // Create a partial contact to pre-fill the form
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
      setScreen({ type: 'form', contact: null });
      // Small delay to let the form mount, then we'll pass via a different mechanism
      // Actually, we pass prefilled as the "contact" prop to pre-fill
      setScreen({ type: 'form', contact: prefilled });
    }
    // Clear the URL param
    window.history.replaceState({}, '', window.location.pathname);
  }, [appState]);

  // Cloud sync on load
  useEffect(() => {
    if (appState !== 'app' || !user || !appSettings.cloudSyncEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        setSyncStatus('syncing');
        const merged = await fullSync(user.uid);
        if (!cancelled) {
          setContacts(merged);
          setSyncStatus('idle');
        }
      } catch (e) {
        console.error('Sync error:', e);
        if (!cancelled) setSyncStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [appState, user, appSettings.cloudSyncEnabled]);

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
      await dbDelete(id);
      if (appSettings.cloudSyncEnabled && user) {
        deleteFromCloud(user.uid, id).catch((e) => {
          console.error('Cloud delete error:', e);
          setSyncStatus('error');
        });
      }
      await refresh();
      setScreen({ type: 'list' });
      showToast('Contact deleted');
    },
    [refresh, showToast, appSettings.cloudSyncEnabled, user]
  );

  const handleLogInteraction = useCallback(
    async (contactId: string, date: string, note: string) => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;
      const updated: Contact = {
        ...contact,
        interactions: [
          ...contact.interactions,
          { id: nanoid(), date, note },
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
      await handleLogInteraction(contactId, today, 'Reconnected');
    },
    [handleLogInteraction]
  );

  const handleSettingsChange = useCallback(
    async (newSettings: AppSettings) => {
      setAppSettings(newSettings);
      await saveAppSettings(newSettings);
    },
    []
  );

  const handleProfileChange = useCallback(
    async (newProfile: UserProfile) => {
      setUserProfile(newProfile);
      await saveUserProfile(newProfile);
    },
    []
  );

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
    return {
      role: collect((c) => c.role),
      company: collect((c) => c.company),
      university: collect((c) => c.university),
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

  const handleNetworkFilter = useCallback((searchQuery: string) => {
    setFilter({
      classification: 'all',
      tag: null,
      search: searchQuery,
    });
    setTab('contacts');
    setScreen({ type: 'list' });
  }, []);

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
    return <Onboarding onComplete={handleOnboardingComplete} isDark={isDark} />;
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
                </>
              )}
              {screen.type === 'detail' && (
                <ContactDetail
                  contact={screen.contact}
                  onBack={() => setScreen({ type: 'list' })}
                  onEdit={() => setScreen({ type: 'form', contact: screen.contact })}
                  onDelete={() => handleDelete(screen.contact.id)}
                  onLogInteraction={(date, note) => handleLogInteraction(screen.contact.id, date, note)}
                  onDeleteInteraction={(interactionId) => handleDeleteInteraction(screen.contact.id, interactionId)}
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

          {tab === 'settings' && (
            <Settings
              isDark={isDark}
              onToggleTheme={toggleTheme}
              onImportComplete={refresh}
              onClearComplete={refresh}
              showToast={showToast}
              onLogout={handleLogout}
              userEmail={user?.email ?? undefined}
              appSettings={appSettings}
              onSettingsChange={handleSettingsChange}
              userProfile={userProfile}
              onProfileChange={handleProfileChange}
            />
          )}
        </AnimatePresence>
      </div>

      <BottomNav active={tab} onChange={handleTabChange} isDark={isDark} />
      <Toast message={toast ?? ''} visible={!!toast} />
    </div>
  );
}
