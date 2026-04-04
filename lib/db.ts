import { openDB, type IDBPDatabase } from 'idb';
import type { Contact, AppSettings, UserProfile, Education, Job } from './types';
import { createEmptyContact } from './utils';

const DB_PREFIX = 'intouch-db';
const DB_VERSION = 2;
const STORE_NAME = 'contacts';
const SETTINGS_STORE = 'settings';

let dbPromise: Promise<IDBPDatabase> | null = null;
let currentUserId: string | null = null;

function getDBName(): string {
  return currentUserId ? `${DB_PREFIX}-${currentUserId}` : DB_PREFIX;
}

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(getDBName(), DB_VERSION, {
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
    reconnectDate: (c.reconnectDate as string) ?? '',
    lastContacted: (c.lastContacted as string) ?? '',
    interactions: (c.interactions as Contact['interactions']) ?? [],
    tags: (c.tags as string[]) ?? [],
    education: (c.education as Contact['education']) ?? [],
    jobs: (c.jobs as Contact['jobs']) ?? [],
    plannedInteractions: (c.plannedInteractions as Contact['plannedInteractions']) ?? [],
  } as Contact;
}

/** Call this when user changes (login/logout) to switch to the correct database */
export function setDBUser(userId: string | null) {
  // Always close + reset even if userId looks the same, to prevent stale connections
  if (dbPromise) {
    dbPromise.then((db) => db.close()).catch(() => {});
    dbPromise = null;
  }
  currentUserId = userId;
}

export async function initDB() {
  await getDB();
}

/** Returns all non-deleted contacts — use this everywhere in the UI */
export async function getAllContacts(): Promise<Contact[]> {
  if (!currentUserId) return [];
  const db = await getDB();
  const raw = await db.getAll(STORE_NAME);
  return raw.map(normalizeContact).filter((c) => !c.deleted);
}

/** Returns all contacts including soft-deleted ones — used only by sync merge */
export async function getAllContactsRaw(): Promise<Contact[]> {
  if (!currentUserId) return [];
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
  cloudSyncEnabled: true, // default ON so new devices always pull from Firestore on first login
  sortOrder: 'name',
  emailNotificationsEnabled: true,
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
  if (!currentUserId) return { ...DEFAULT_PROFILE };
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
