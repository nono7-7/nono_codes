import { openDB, type IDBPDatabase } from 'idb';
import type { Contact, AppSettings } from './types';
import { nanoid } from 'nanoid';
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

// CSV Import for LinkedIn exports
// Expected columns: First Name, Last Name, Email Address, Company, Position, Connected On
export async function importContactsFromCSV(csvText: string): Promise<number> {
  const lines = parseCSVLines(csvText);
  if (lines.length < 2) return 0;

  const headers = lines[0].map((h) => h.trim().toLowerCase());
  const firstNameIdx = headers.indexOf('first name');
  const lastNameIdx = headers.indexOf('last name');
  const emailIdx = headers.indexOf('email address');
  const companyIdx = headers.indexOf('company');
  const positionIdx = headers.indexOf('position');
  const connectedOnIdx = headers.indexOf('connected on');

  if (firstNameIdx === -1 && lastNameIdx === -1) return 0;

  const existing = await getAllContacts();
  const existingNames = new Set(existing.map((c) => c.name.toLowerCase().trim()));
  const db = await getDB();
  let imported = 0;
  const now = new Date().toISOString();

  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const firstName = (firstNameIdx >= 0 ? row[firstNameIdx]?.trim() : '') || '';
    const lastName = (lastNameIdx >= 0 ? row[lastNameIdx]?.trim() : '') || '';
    const name = `${firstName} ${lastName}`.trim();
    if (!name) continue;
    if (existingNames.has(name.toLowerCase())) continue;

    const empty = createEmptyContact();
    const contact: Contact = {
      ...empty,
      id: nanoid(),
      name,
      email: (emailIdx >= 0 ? row[emailIdx]?.trim() : '') || '',
      company: (companyIdx >= 0 ? row[companyIdx]?.trim() : '') || '',
      role: (positionIdx >= 0 ? row[positionIdx]?.trim() : '') || '',
      dateMet: (connectedOnIdx >= 0 ? row[connectedOnIdx]?.trim() : '') || '',
      dateAdded: now,
      lastUpdated: now,
    };

    await tx.store.put(contact);
    existingNames.add(name.toLowerCase());
    imported++;
  }
  await tx.done;
  return imported;
}

function parseCSVLines(csv: string): string[][] {
  const results: string[][] = [];
  const lines = csv.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    results.push(fields);
  }
  return results;
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
