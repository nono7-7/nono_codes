/**
 * vCard (.vcf) Parser
 *
 * Parses vCard 2.1, 3.0, and 4.0 files into Contact objects.
 * A single .vcf file may contain multiple vCards (one per contact).
 */

import { nanoid } from 'nanoid';
import type { Contact } from '@/lib/types';

/** Parse a vCard property line, handling folded lines and encoding */
function parseVCard(text: string): Contact[] {
  // Unfold lines (continuation lines start with space or tab)
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n|\r/);

  const contacts: Contact[] = [];
  let current: Record<string, string[]> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.toUpperCase() === 'BEGIN:VCARD') {
      current = {};
      continue;
    }
    if (line.toUpperCase() === 'END:VCARD') {
      if (current) {
        const c = buildContact(current);
        if (c.name.trim()) contacts.push(c);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    // Split property name/params from value
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const propFull = line.slice(0, colonIdx).toUpperCase();
    const value = decodeValue(line.slice(colonIdx + 1), propFull);

    // Property name is before any semicolons (params after semicolon)
    const propName = propFull.split(';')[0];

    if (!current[propName]) current[propName] = [];
    current[propName].push(value);
  }

  return contacts;
}

function decodeValue(raw: string, propFull: string): string {
  // Handle quoted-printable encoding
  if (propFull.includes('ENCODING=QUOTED-PRINTABLE') || propFull.includes('QUOTED-PRINTABLE')) {
    try {
      // Decode =XX hex sequences
      return raw
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/=\s*$/g, ''); // strip soft line breaks
    } catch {
      return raw;
    }
  }
  // Handle base64 (skip — we won't decode photo data)
  if (propFull.includes('ENCODING=BASE64') || propFull.includes('BASE64')) {
    return '';
  }
  return raw;
}

function parseN(value: string): string {
  // N field: Last;First;Middle;Prefix;Suffix
  const parts = value.split(';');
  const last = (parts[0] || '').trim();
  const first = (parts[1] || '').trim();
  const middle = (parts[2] || '').trim();
  return [first, middle, last].filter(Boolean).join(' ');
}

function parseBirthday(value: string): string {
  // BDAY can be YYYY-MM-DD, YYYYMMDD, or --MMDD (no year)
  const clean = value.replace(/[-T].*$/, '').replace(/-/g, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  if (value.startsWith('--')) {
    // No year: --MMDD
    const mmdd = value.slice(2).replace('-', '');
    return `1900-${mmdd.slice(0, 2)}-${mmdd.slice(2, 4)}`;
  }
  return value.slice(0, 10);
}

function buildContact(props: Record<string, string[]>): Contact {
  const now = new Date().toISOString();
  const get = (key: string) => (props[key]?.[0] || '').trim();

  // Name: prefer FN (formatted name), fall back to N (structured name)
  let name = get('FN');
  if (!name && props['N']?.[0]) {
    name = parseN(props['N'][0]);
  }

  // Phone: take first TEL entry
  const phone = get('TEL');

  // Email: take first EMAIL entry
  const email = get('EMAIL');

  // Company / role from ORG and TITLE
  const org = get('ORG').split(';')[0].trim(); // ORG can be "Company;Department"
  const role = get('TITLE');

  // Address / location from ADR: PO;ext;street;city;region;postal;country
  let homeLocation = '';
  if (props['ADR']?.[0]) {
    const adrParts = props['ADR'][0].split(';');
    const city = (adrParts[3] || '').trim();
    const country = (adrParts[6] || '').trim();
    homeLocation = [city, country].filter(Boolean).join(', ');
  }

  // Birthday
  let birthday = '';
  if (props['BDAY']?.[0]) {
    try { birthday = parseBirthday(props['BDAY'][0]); } catch { birthday = ''; }
  }

  // Notes
  const notes = get('NOTE').replace(/\\n/g, '\n').replace(/\\,/g, ',');

  // URL → LinkedIn if it contains linkedin
  let linkedinUrl = '';
  for (const url of props['URL'] || []) {
    if (url.toLowerCase().includes('linkedin')) { linkedinUrl = url; break; }
  }

  // Build jobs
  const jobs = (org || role) ? [{
    id: nanoid(),
    company: org,
    role,
    isCurrent: true,
  }] : [];

  return {
    id: nanoid(),
    name,
    role,
    company: org,
    university: '',
    classification: 'wider' as const,
    howMet: '',
    whereMet: '',
    eventOrContext: '',
    dateMet: '',
    homeLocation,
    nationality: '',
    linkedinUrl,
    phone,
    email,
    notes,
    birthday,
    tags: [],
    photoUrl: '',
    reconnectIntervalWeeks: null,
    reconnectDate: '',
    lastContacted: '',
    interactions: [],
    education: [],
    jobs,
    plannedInteractions: [],
    dateAdded: now,
    lastUpdated: now,
  };
}

export async function parseVCardFile(file: File): Promise<Contact[]> {
  const text = await file.text();
  return parseVCard(text);
}
