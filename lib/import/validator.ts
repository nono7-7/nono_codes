/**
 * Row Validation & Duplicate Detection
 *
 * Validation rules:
 * - A row MUST have a non-empty name to be valid
 * - All other fields are optional
 *
 * Duplicate detection (checked against existing contacts):
 * - Exact email match (case-insensitive)
 * - Exact phone match (digits only)
 * - Name + company match (both case-insensitive)
 *
 * Intra-file duplicates are also detected (same logic within the import batch).
 */

import type { Contact } from '../types';
import type { ImportRow, ColumnMapping, ImportSummary, MappableField } from './types';
import { nanoid } from 'nanoid';

// ── Row Mapping ─────────────────────────────────────────────────────

/**
 * Map a single raw row to contact fields using the confirmed column mappings.
 * Handles first+last name combination and tag splitting.
 */
export function mapRow(
  rawRow: Record<string, string>,
  mappings: ColumnMapping[],
  headers: string[],
): Record<string, string> {
  const mapped: Record<string, string> = {};

  // Find first name / last name headers for combination
  const firstNameHeader = headers.find((h) => {
    const n = h.toLowerCase().replace(/[^a-z]/g, '');
    return n === 'firstname' || n === 'first name'.replace(/\s/g, '');
  });
  const lastNameHeader = headers.find((h) => {
    const n = h.toLowerCase().replace(/[^a-z]/g, '');
    return n === 'lastname' || n === 'last name'.replace(/\s/g, '');
  });

  for (const m of mappings) {
    if (!m.mappedTo || m.mappedTo === 'skip') continue;
    const val = rawRow[m.originalHeader]?.trim() || '';
    if (!val) continue;

    // Special: if this is the "name" field mapped from "first name",
    // combine with last name
    if (m.mappedTo === 'name' && firstNameHeader && lastNameHeader && m.originalHeader === firstNameHeader) {
      const first = rawRow[firstNameHeader]?.trim() || '';
      const last = rawRow[lastNameHeader]?.trim() || '';
      mapped.name = [first, last].filter(Boolean).join(' ');
      continue;
    }

    mapped[m.mappedTo] = val;
  }

  return mapped;
}

// ── Validation ──────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Validate and tag rows with status.
 * existingContacts = contacts already in the user's database.
 */
export function validateRows(
  rawRows: Record<string, string>[],
  mappings: ColumnMapping[],
  headers: string[],
  existingContacts: Contact[],
): { rows: ImportRow[]; summary: ImportSummary } {
  // Build lookup sets from existing contacts
  const existingEmails = new Set(
    existingContacts.map((c) => c.email.toLowerCase()).filter(Boolean)
  );
  const existingPhones = new Set(
    existingContacts.map((c) => normalizePhone(c.phone)).filter(Boolean)
  );
  const existingNameCompany = new Set(
    existingContacts
      .filter((c) => c.name)
      .map((c) => `${c.name.toLowerCase()}|||${(c.company || '').toLowerCase()}`)
  );

  // Track intra-batch duplicates
  const batchEmails = new Set<string>();
  const batchPhones = new Set<string>();
  const batchNameCompany = new Set<string>();

  const rows: ImportRow[] = [];
  let ready = 0, duplicate = 0, invalid = 0, skipped = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const mapped = mapRow(rawRow, mappings, headers);

    // Validate: name is required
    if (!mapped.name?.trim()) {
      rows.push({
        rowIndex: i,
        rawRow,
        mapped,
        status: 'invalid',
        statusReason: 'Missing name',
      });
      invalid++;
      continue;
    }

    // Check duplicates against existing DB
    const email = (mapped.email || '').toLowerCase();
    const phone = normalizePhone(mapped.phone || '');
    const nameCompany = `${mapped.name.toLowerCase()}|||${(mapped.company || '').toLowerCase()}`;

    let isDuplicate = false;
    let dupReason = '';

    if (email && existingEmails.has(email)) {
      isDuplicate = true;
      dupReason = `Email "${email}" already exists`;
    } else if (phone && existingPhones.has(phone)) {
      isDuplicate = true;
      dupReason = `Phone already exists`;
    } else if (existingNameCompany.has(nameCompany)) {
      isDuplicate = true;
      dupReason = `"${mapped.name}" at "${mapped.company || '(no company)'}" already exists`;
    }

    // Check intra-batch duplicates
    if (!isDuplicate) {
      if (email && batchEmails.has(email)) {
        isDuplicate = true;
        dupReason = `Duplicate email in file`;
      } else if (phone && batchPhones.has(phone)) {
        isDuplicate = true;
        dupReason = `Duplicate phone in file`;
      } else if (batchNameCompany.has(nameCompany)) {
        isDuplicate = true;
        dupReason = `Duplicate name+company in file`;
      }
    }

    if (isDuplicate) {
      rows.push({ rowIndex: i, rawRow, mapped, status: 'duplicate', statusReason: dupReason });
      duplicate++;
    } else {
      rows.push({ rowIndex: i, rawRow, mapped, status: 'ready', statusReason: '' });
      ready++;
    }

    // Add to batch tracking
    if (email) batchEmails.add(email);
    if (phone) batchPhones.add(phone);
    batchNameCompany.add(nameCompany);
  }

  return {
    rows,
    summary: { total: rawRows.length, ready, duplicate, invalid, skipped },
  };
}

// ── Row → Contact Conversion ────────────────────────────────────────

/**
 * Convert a mapped row into a full Contact object ready for saving.
 * Only sets fields that have values — everything else stays at defaults.
 */
export function rowToContact(mapped: Record<string, string>): Contact {
  const now = new Date().toISOString();

  // Parse tags: split by comma, semicolon, or pipe
  const tags = mapped.tags
    ? mapped.tags.split(/[,;|]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
    : [];

  // Parse classification
  let classification: 'inner' | 'wider' = 'wider';
  if (mapped.classification) {
    const cl = mapped.classification.toLowerCase().trim();
    if (cl === 'inner' || cl === 'inner circle') classification = 'inner';
  }

  // Parse reconnect weeks
  let reconnectIntervalWeeks: number | null = null;
  if (mapped.reconnectIntervalWeeks) {
    const n = parseInt(mapped.reconnectIntervalWeeks, 10);
    if (!isNaN(n) && n > 0) reconnectIntervalWeeks = n;
  }

  // Build education array (at most one entry from import)
  const education = [];
  if (mapped.university) {
    education.push({
      id: nanoid(),
      university: mapped.university,
      program: mapped.program || '',
      gradYear: '',
      isPrimary: true,
    });
  }

  // Build jobs array (at most one entry from import)
  const jobs = [];
  if (mapped.company || mapped.role) {
    jobs.push({
      id: nanoid(),
      company: mapped.company || '',
      role: mapped.role || '',
      isCurrent: true,
    });
  }

  return {
    id: nanoid(),
    name: mapped.name || '',
    role: mapped.role || '',
    company: mapped.company || '',
    university: mapped.university || '',
    classification,
    howMet: mapped.howMet || '',
    whereMet: mapped.whereMet || '',
    eventOrContext: mapped.eventOrContext || '',
    dateMet: mapped.dateMet || '',
    homeLocation: mapped.homeLocation || '',
    nationality: '',
    linkedinUrl: mapped.linkedinUrl || '',
    phone: mapped.phone || '',
    email: mapped.email || '',
    notes: mapped.notes || '',
    birthday: mapped.birthday || '',
    tags,
    photoUrl: '',
    reconnectIntervalWeeks,
    reconnectDate: mapped.reconnectDate || '',
    lastContacted: '',
    interactions: [],
    education,
    jobs,
    plannedInteractions: [],
    dateAdded: now,
    lastUpdated: now,
  };
}
