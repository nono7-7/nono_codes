/**
 * LinkedIn Connections CSV Parser
 *
 * LinkedIn export format (Settings → Data Privacy → Get a copy of your data → Connections):
 * Headers: First Name, Last Name, Email Address, Company, Position, Connected On
 *
 * Notes:
 * - The file often has 2-3 header/note rows before the actual column headers
 * - We find the real header row by looking for "First Name"
 */

import * as XLSX from 'xlsx';
import type { Contact } from '@/lib/types';
import { nanoid } from 'nanoid';

export interface LinkedInContact {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  company: string;
  role: string;
  connectedOn: string;
  linkedinUrl: string;
}

export interface LinkedInUpdateResult {
  /** Contacts already in InTouch that have changed company/role on LinkedIn */
  updates: Array<{
    existing: Contact;
    linkedin: LinkedInContact;
    changes: { field: 'company' | 'role'; from: string; to: string }[];
  }>;
  /** LinkedIn connections not yet in InTouch */
  newContacts: LinkedInContact[];
}

export async function parseLinkedInFile(file: File): Promise<LinkedInContact[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const aoa: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];

  // Find the real header row (contains "First Name")
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const row = aoa[i].map((c) => String(c).trim());
    if (row.some((c) => c.toLowerCase() === 'first name')) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) throw new Error('Could not find header row. Make sure this is a LinkedIn Connections CSV.');

  const headers = aoa[headerRowIdx].map((h) => String(h).trim().toLowerCase());
  const get = (row: string[], key: string) => {
    const idx = headers.indexOf(key);
    return idx >= 0 ? String(row[idx] ?? '').trim() : '';
  };

  const contacts: LinkedInContact[] = [];
  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const row = aoa[i].map((c) => String(c ?? '').trim());
    if (row.every((c) => !c)) continue; // skip empty rows

    const firstName = get(row, 'first name');
    const lastName = get(row, 'last name');
    const name = [firstName, lastName].filter(Boolean).join(' ');
    if (!name) continue;

    contacts.push({
      firstName,
      lastName,
      name,
      email: get(row, 'email address'),
      company: get(row, 'company'),
      role: get(row, 'position'),
      connectedOn: get(row, 'connected on'),
      linkedinUrl: get(row, 'url'),
    });
  }

  return contacts;
}

/** Normalize a string for loose matching (lowercase, no punctuation, collapse spaces) */
function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Match LinkedIn contacts against existing InTouch contacts */
export function matchLinkedIn(
  linkedIn: LinkedInContact[],
  existing: Contact[]
): LinkedInUpdateResult {
  const updates: LinkedInUpdateResult['updates'] = [];
  const matchedLinkedInIndices = new Set<number>();

  for (const contact of existing) {
    const contactNorm = norm(contact.name);
    const matchIdx = linkedIn.findIndex((li, i) => {
      if (matchedLinkedInIndices.has(i)) return false;
      return norm(li.name) === contactNorm;
    });
    if (matchIdx === -1) continue;

    const li = linkedIn[matchIdx];
    matchedLinkedInIndices.add(matchIdx);

    const changes: LinkedInUpdateResult['updates'][0]['changes'] = [];

    // Check company change (compare against primary job or top-level company)
    const currentCompany = contact.jobs?.find((j) => j.isCurrent)?.company || contact.company || '';
    if (li.company && norm(li.company) !== norm(currentCompany)) {
      changes.push({ field: 'company', from: currentCompany, to: li.company });
    }

    // Check role change
    const currentRole = contact.jobs?.find((j) => j.isCurrent)?.role || contact.role || '';
    if (li.role && norm(li.role) !== norm(currentRole)) {
      changes.push({ field: 'role', from: currentRole, to: li.role });
    }

    if (changes.length > 0) {
      updates.push({ existing: contact, linkedin: li, changes });
    }
  }

  // New contacts = LinkedIn connections not matched to any existing contact
  const newContacts = linkedIn.filter((_, i) => !matchedLinkedInIndices.has(i));

  return { updates, newContacts };
}

/** Apply selected updates + create new contacts from LinkedIn data */
export function linkedInToContact(li: LinkedInContact): Contact {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    name: li.name,
    role: li.role,
    company: li.company,
    university: '',
    classification: 'wider' as const,
    howMet: '',
    whereMet: '',
    eventOrContext: '',
    dateMet: '',
    homeLocation: '',
    nationality: '',
    linkedinUrl: li.linkedinUrl,
    phones: [],
    emails: li.email ? [{ id: 'li', label: 'personal' as const, address: li.email }] : [],
    notes: '',
    birthday: '',
    tags: [],
    photoUrl: '',
    reconnectIntervalWeeks: null,
    reconnectDate: '',
    lastContacted: '',
    interactions: [],
    education: [],
    jobs: (li.company || li.role) ? [{
      id: nanoid(),
      company: li.company,
      role: li.role,
      isCurrent: true,
    }] : [],
    plannedInteractions: [],
    dateAdded: now,
    lastUpdated: now,
  };
}
