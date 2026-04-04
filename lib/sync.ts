import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { PlannedInteraction } from './types';
import { app } from './firebase';
import type { Contact } from './types';
import { getAllContacts, saveContact } from './db';

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

  // Add all local contacts
  for (const c of local) {
    map.set(c.id, c);
  }

  // Merge remote: newer lastUpdated wins
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
  const [local, remote] = await Promise.all([
    getAllContacts(),
    pullFromCloud(uid),
  ]);

  const merged = mergeContacts(local, remote);

  // Write merged set back to local DB
  for (const contact of merged) {
    await saveContact(contact);
  }

  // Write merged set to cloud
  for (const contact of merged) {
    await syncToCloud(uid, contact);
  }

  return merged;
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
