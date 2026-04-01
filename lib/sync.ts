import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { app } from './firebase';
import type { Contact } from './types';
import { getAllContacts, saveContact } from './db';

let db: ReturnType<typeof getFirestore> | null = null;
let persistenceEnabled = false;

function getDB() {
  if (!db) {
    db = getFirestore(app);
    if (!persistenceEnabled && typeof window !== 'undefined') {
      persistenceEnabled = true;
      enableIndexedDbPersistence(db).catch(() => {
        // Persistence may fail if multiple tabs are open — that's OK
      });
    }
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
