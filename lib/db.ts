import { openDB, type IDBPDatabase } from 'idb';
import type { Contact, AppSettings, UserProfile, Education, Job } from './types';
import { createEmptyContact } from './utils';

const DB_NAME = 'intouch-db';
const DB_VERSION = 2;
const STORE_NAME = 'contacts';
const SETTINGS_STORE = 'settings';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
            db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
          }
        }
      },
    });
  }
  return dbPromise;
}

const CONTACT_DEFAULTS = createEmptyContact();

function normalizeContact(c: Record<string, unknown>): Contact {
  return {
    ...CONTACT_DEFAULTS,
    id: '',
    dateAdded: '',
    lastUpdated: '',
    ...c,
    photoUrl: (c.photoUrl as string) ?? '',
    reconnectIntervalWeeks: (c.reconnectIntervalWeeks as number | null) ?? null,
    lastContacted: (c.lastContacted as string) ?? '',
    interactions: (c.interactions as Contact['interactions']) ?? [],
    tags: (c.tags as string[]) ?? [],
  } as Contact;
}

export async function initDB() {
  await getDB();
}

export async function getAllContacts(): Promise<Contact[]> {
  const db = await getDB();
  const raw = await db.getAll(STORE_NAME);
  return raw.map(normalizeContact);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const db = await getDB();
  const raw = await db.get(STORE_NAME, id);
  return raw ? normalizeContact(raw) : undefined;
}

export async function saveContact(contact: Contact): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, contact);
}

export async function deleteContact(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function exportContacts(): Promise<string> {
  const contacts = await getAllContacts();
  return JSON.stringify(contacts, null, 2);
}

export async function importContacts(json: string): Promise<number> {
  const incoming: Contact[] = JSON.parse(json);
  const existing = await getAllContacts();
  const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
  const db = await getDB();
  let imported = 0;

  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const contact of incoming) {
    if (!existingNames.has(contact.name.toLowerCase())) {
      await tx.store.put(normalizeContact(contact as unknown as Record<string, unknown>));
      imported++;
    }
  }
  await tx.done;
  return imported;
}

// App Settings
const DEFAULT_SETTINGS: AppSettings = {
  reconnectRemindersEnabled: true,
  cloudSyncEnabled: false,
  sortOrder: 'name',
};

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDB();
  const raw = await db.get(SETTINGS_STORE, 'app');
  if (!raw) return { ...DEFAULT_SETTINGS };
  const { key: _, ...rest } = raw;
  return { ...DEFAULT_SETTINGS, ...rest };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put(SETTINGS_STORE, { key: 'app', ...settings });
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

// User Profile
const DEFAULT_PROFILE: UserProfile = {
  name: '',
  photoUrl: '',
  phone: '',
  email: '',
  linkedinUrl: '',
  birthday: '',
  mainLocation: '',
  education: [] as Education[],
  jobs: [] as Job[],
  sharePhone: false,
  shareEmail: false,
  shareLinkedin: false,
  shareBirthday: false,
  shareLocation: false,
  shareEducation: false,
  shareJobs: false,
};

export async function getUserProfile(): Promise<UserProfile> {
  const db = await getDB();
  const raw = await db.get(SETTINGS_STORE, 'profile');
  if (!raw) return { ...DEFAULT_PROFILE };
  const { key: _, ...rest } = raw;
  return { ...DEFAULT_PROFILE, ...rest };
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put(SETTINGS_STORE, { key: 'profile', ...profile });
}
