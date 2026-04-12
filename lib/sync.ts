import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { PlannedInteraction, UserProfile } from './types';
import { app } from './firebase';
import type { Contact } from './types';
import { getAllContactsRaw, saveContact } from './db';

let db: ReturnType<typeof getFirestore> | null = null;

function getDB() {
  if (!db) {
    db = getFirestore(app);
  }
  return db;
}

function contactsRef(uid: string) {
  return collection(getDB(), 'users', uid, 'contacts');
}

export async function syncToCloud(uid: string, contact: Contact): Promise<void> {
  const ref = doc(contactsRef(uid), contact.id);
  await setDoc(ref, contact);
}

export async function deleteFromCloud(uid: string, contactId: string): Promise<void> {
  const ref = doc(contactsRef(uid), contactId);
  await deleteDoc(ref);
}

export async function pullFromCloud(uid: string): Promise<Contact[]> {
  const snapshot = await getDocs(contactsRef(uid));
  return snapshot.docs.map((d) => d.data() as Contact);
}

export function mergeContacts(local: Contact[], remote: Contact[]): Contact[] {
  const map = new Map<string, Contact>();

  // Seed with local (includes soft-deleted)
  for (const c of local) {
    map.set(c.id, c);
  }

  // Merge remote: newer lastUpdated always wins (including deletions)
  for (const c of remote) {
    const existing = map.get(c.id);
    if (!existing) {
      map.set(c.id, c);
    } else {
      const existingTime = new Date(existing.lastUpdated).getTime();
      const remoteTime = new Date(c.lastUpdated).getTime();
      if (remoteTime > existingTime) {
        map.set(c.id, c);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Write a planned interaction to Firestore so the daily cron job can
 * send email reminders 2 days before and on the day of the event.
 * This is independent of cloud sync — it works even if cloudSyncEnabled is false.
 */
export async function savePlannedNotification(
  uid: string,
  userEmail: string,
  contactName: string,
  planned: PlannedInteraction,
): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'notifications', `${uid}_${planned.id}`);
  await setDoc(ref, {
    uid,
    userEmail,
    contactName,
    plannedId: planned.id,
    date: planned.date,
    description: planned.description,
    completed: planned.completed,
    createdAt: new Date().toISOString(),
  });
}

/** Sync the user's email notification preference to Firestore so the cron can read it */
export async function syncEmailPreference(uid: string, enabled: boolean): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'users', uid, 'settings', 'app');
  await setDoc(ref, { emailNotificationsEnabled: enabled }, { merge: true });
}

/**
 * Write a reconnect interval notification to Firestore so the cron sends a
 * push at 9 AM on the computed next-due date.
 * nextDueDate: YYYY-MM-DD
 */
export async function saveReconnectNotification(
  uid: string,
  contactId: string,
  contactName: string,
  nextDueDate: string,
): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'notifications', `${uid}_reconnect_${contactId}`);
  await setDoc(ref, {
    uid,
    contactName,
    date: nextDueDate,
    description: 'Reconnect reminder',
    completed: false,
    createdAt: new Date().toISOString(),
  });
}

/** Remove the reconnect interval notification when interval is cleared */
export async function clearReconnectNotification(
  uid: string,
  contactId: string,
): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'notifications', `${uid}_reconnect_${contactId}`);
  await setDoc(ref, { completed: true }, { merge: true });
}

/**
 * Write a reach-out date notification to Firestore so the cron sends a push
 * at 9 AM (user's timezone) on the chosen date.
 */
export async function saveReachOutNotification(
  uid: string,
  contactId: string,
  contactName: string,
  date: string,
): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'notifications', `${uid}_reachout_${contactId}`);
  await setDoc(ref, {
    uid,
    contactName,
    date,
    description: 'Reach out',
    completed: false,
    createdAt: new Date().toISOString(),
  });
}

/** Remove the reach-out notification for a contact (date cleared or toggle off) */
export async function clearReachOutNotification(
  uid: string,
  contactId: string,
): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'notifications', `${uid}_reachout_${contactId}`);
  await setDoc(ref, { completed: true }, { merge: true });
}

/** Mark a planned notification as completed so no more emails are sent */
export async function completePlannedNotification(
  uid: string,
  plannedId: string,
): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'notifications', `${uid}_${plannedId}`);
  await setDoc(ref, { completed: true }, { merge: true });
}

export async function fullSync(uid: string): Promise<Contact[]> {
  // Use raw (includes soft-deleted) so deletions aren't lost during merge
  const [local, remote] = await Promise.all([
    getAllContactsRaw(),
    pullFromCloud(uid),
  ]);

  const merged = mergeContacts(local, remote);

  // Write full merged set (including soft-deleted) back to local DB
  for (const contact of merged) {
    await saveContact(contact);
  }

  // Write full merged set to cloud so deletions propagate
  for (const contact of merged) {
    await syncToCloud(uid, contact);
  }

  // Return only non-deleted contacts for the UI
  return merged.filter((c) => !c.deleted);
}

/**
 * Force-upload all contacts from local IndexedDB to Firestore.
 * Use this to push an existing local collection to the cloud for the first time.
 */
export async function forceUploadAll(uid: string, contacts: Contact[]): Promise<void> {
  for (const contact of contacts) {
    await syncToCloud(uid, contact);
  }
}

/**
 * Sync the user's profile to Firestore so it appears on all devices.
 * photoUrl is excluded because base64 images can exceed Firestore's 1MB document limit.
 * The photo stays device-local; everything else syncs.
 */
export async function syncProfileToCloud(uid: string, profile: UserProfile): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'users', uid, 'settings', 'profile');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { photoUrl: _photo, ...profileWithoutPhoto } = profile;
  await setDoc(ref, profileWithoutPhoto, { merge: true });
}

/**
 * Pull the user's profile from Firestore.
 * Returns null if no profile exists in the cloud yet.
 */
export async function pullProfileFromCloud(uid: string): Promise<Partial<UserProfile> | null> {
  const db = getDB();
  const ref = doc(db, 'users', uid, 'settings', 'profile');
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Partial<UserProfile>;
}

/**
 * Store a native Web Push subscription for this device under
 * users/{uid}/pushSubscriptions/{subId}.
 * Uses a stable ID derived from the endpoint so the same device never
 * creates duplicate documents.
 */
export async function storePushSubscription(uid: string, subscription: PushSubscription): Promise<void> {
  const db = getDB();
  const subJson = subscription.toJSON();
  // Stable doc ID from endpoint (safe base64url without padding)
  const subId = btoa(subscription.endpoint).replace(/[+/=]/g, '').slice(0, 40);
  await setDoc(doc(db, 'users', uid, 'pushSubscriptions', subId), {
    endpoint: subJson.endpoint,
    keys: subJson.keys,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Remove a stored push subscription (e.g. on logout or when unsubscribed).
 */
export async function removePushSubscription(uid: string, subscription: PushSubscription): Promise<void> {
  const db = getDB();
  const subId = btoa(subscription.endpoint).replace(/[+/=]/g, '').slice(0, 40);
  await deleteDoc(doc(db, 'users', uid, 'pushSubscriptions', subId));
}

/**
 * Store the user's IANA timezone (e.g. "Europe/Madrid") in Firestore so the
 * cron job can send notifications at 9 AM in their local time.
 */
export async function storeUserTimezone(uid: string, timezone: string): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'users', uid, 'settings', 'app');
  await setDoc(ref, { timezone }, { merge: true });
}

/** @deprecated Use storePushSubscription instead. Kept for backwards compat during migration. */
export async function storePushToken(uid: string, token: string): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'users', uid, 'tokens', token);
  await setDoc(ref, { token, updatedAt: new Date().toISOString() });
}

/** @deprecated Use removePushSubscription instead. */
export async function removePushToken(uid: string, token: string): Promise<void> {
  const db = getDB();
  const ref = doc(db, 'users', uid, 'tokens', token);
  await deleteDoc(ref);
}
