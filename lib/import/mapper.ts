/**
 * Header Mapping Engine
 *
 * Strategy (in priority order):
 * 1. Exact match after normalization (strip spaces, lowercase, remove punctuation)
 * 2. Synonym dictionary lookup (e.g. "mobile" → phone, "dob" → birthday)
 * 3. Value-pattern detection (e.g. column full of emails → email field)
 *
 * The mapper produces a confidence score (0-1) for each mapping.
 * High confidence (≥0.8) = auto-mapped. Low confidence = flagged for user review.
 *
 * Important: only one column can map to each field. If two columns compete
 * for the same field, the higher-confidence one wins and the other is set to null.
 */

import type { ColumnMapping, MappableField } from './types';

// ── Synonym Dictionary ──────────────────────────────────────────────

const SYNONYMS: Record<string, MappableField> = {
  // name
  'name': 'name',
  'fullname': 'name',
  'full name': 'name',
  'contact name': 'name',
  'contactname': 'name',
  'first name': 'name', // will be combined if last name exists
  'firstname': 'name',
  'last name': 'name',
  'lastname': 'name',
  'person': 'name',
  'contact': 'name',

  // location
  'homelocation': 'homeLocation',
  'home location': 'homeLocation',
  'city': 'homeLocation',
  'location': 'homeLocation',
  'hometown': 'homeLocation',
  'home city': 'homeLocation',
  'homecity': 'homeLocation',
  'based in': 'homeLocation',

  // education
  'university': 'university',
  'uni': 'university',
  'school': 'university',
  'college': 'university',
  'education': 'university',
  'institution': 'university',
  'alma mater': 'university',
  'program': 'program',
  'programme': 'program',
  'degree': 'program',
  'major': 'program',
  'field of study': 'program',

  // work
  'company': 'company',
  'employer': 'company',
  'organization': 'company',
  'organisation': 'company',
  'firm': 'company',
  'workplace': 'company',
  'role': 'role',
  'title': 'role',
  'job title': 'role',
  'jobtitle': 'role',
  'position': 'role',
  'job': 'role',
  'occupation': 'role',

  // contact info
  'phone': 'phone',
  'phone number': 'phone',
  'phonenumber': 'phone',
  'mobile': 'phone',
  'cell': 'phone',
  'telephone': 'phone',
  'tel': 'phone',
  'cell phone': 'phone',
  'mobile phone': 'phone',
  'email': 'email',
  'e-mail': 'email',
  'email address': 'email',
  'work email': 'email',
  'personal email': 'email',
  'emailaddress': 'email',
  'linkedin': 'linkedinUrl',
  'linkedin profile': 'linkedinUrl',
  'linkedin url': 'linkedinUrl',
  'linkedinurl': 'linkedinUrl',
  'linkedin link': 'linkedinUrl',

  // personal
  'birthday': 'birthday',
  'birthdate': 'birthday',
  'birth date': 'birthday',
  'dob': 'birthday',
  'date of birth': 'birthday',
  'dateofbirth': 'birthday',
  'bday': 'birthday',

  // notes
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
  'comment': 'notes',
  'description': 'notes',
  'memo': 'notes',
  'remarks': 'notes',

  // tags
  'tags': 'tags',
  'tag': 'tags',
  'labels': 'tags',
  'label': 'tags',
  'categories': 'tags',
  'category': 'tags',
  'groups': 'tags',
  'group': 'tags',

  // classification
  'classification': 'classification',
  'circle': 'classification',
  'tier': 'classification',
  'network tier': 'classification',

  // how met
  'how met': 'howMet',
  'howmet': 'howMet',
  'how we met': 'howMet',
  'how did you meet': 'howMet',
  'met how': 'howMet',
  'met through': 'howMet',
  'where met': 'whereMet',
  'wheremet': 'whereMet',
  'met where': 'whereMet',
  'location met': 'whereMet',
  'event': 'eventOrContext',
  'context': 'eventOrContext',
  'event or context': 'eventOrContext',
  'eventorcontext': 'eventOrContext',
  'when met': 'dateMet',
  'whenmet': 'dateMet',
  'date met': 'dateMet',
  'datemet': 'dateMet',
  'met when': 'dateMet',

  // reconnect
  'reconnect': 'reconnectIntervalWeeks',
  'reconnect reminder': 'reconnectIntervalWeeks',
  'reminder weeks': 'reconnectIntervalWeeks',
  'reconnect weeks': 'reconnectIntervalWeeks',
  'reconnect date': 'reconnectDate',
  'reminder date': 'reconnectDate',
};

// ── Value Pattern Detectors ─────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\+]?[\d\s\-().]{7,}$/;
const LINKEDIN_RE = /linkedin\.com\/in\//i;
const DATE_RE = /^\d{4}[-/]\d{2}[-/]\d{2}$/;

/**
 * Detect field from value patterns. Returns null if no strong pattern found.
 * Only called when synonym matching fails.
 */
function detectFieldFromValues(values: string[]): { field: MappableField; confidence: number } | null {
  const nonEmpty = values.filter((v) => v.length > 0);
  if (nonEmpty.length === 0) return null;

  const ratio = (test: (v: string) => boolean) => nonEmpty.filter(test).length / nonEmpty.length;

  const emailRatio = ratio((v) => EMAIL_RE.test(v));
  if (emailRatio > 0.6) return { field: 'email', confidence: 0.7 + emailRatio * 0.2 };

  const phoneRatio = ratio((v) => PHONE_RE.test(v));
  if (phoneRatio > 0.6) return { field: 'phone', confidence: 0.6 + phoneRatio * 0.2 };

  const linkedinRatio = ratio((v) => LINKEDIN_RE.test(v));
  if (linkedinRatio > 0.5) return { field: 'linkedinUrl', confidence: 0.7 + linkedinRatio * 0.2 };

  const dateRatio = ratio((v) => DATE_RE.test(v));
  if (dateRatio > 0.5) return { field: 'birthday', confidence: 0.4 }; // low — could be any date

  return null;
}

// ── Normalization ───────────────────────────────────────────────────

function normalize(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Main Mapping Function ───────────────────────────────────────────

/**
 * Auto-map file headers to contact fields.
 *
 * Returns one ColumnMapping per header. Each mapping includes:
 * - The original header text
 * - The best-guess field (or null if unknown)
 * - A confidence score
 * - Sample values from the data
 */
export function autoMapHeaders(
  headers: string[],
  rows: Record<string, string>[],
): ColumnMapping[] {
  // Collect sample values (first 5 non-empty per column)
  const samples: Record<string, string[]> = {};
  for (const h of headers) {
    samples[h] = [];
    for (const row of rows) {
      if (samples[h].length >= 5) break;
      const v = row[h]?.trim();
      if (v) samples[h].push(v);
    }
  }

  // First pass: synonym-based mapping with confidence
  const rawMappings: ColumnMapping[] = headers.map((header) => {
    const norm = normalize(header);

    // Exact synonym match
    if (SYNONYMS[norm]) {
      return {
        originalHeader: header,
        mappedTo: SYNONYMS[norm],
        confidence: 1.0,
        sampleValues: samples[header],
      };
    }

    // Partial synonym match: check if any synonym is contained in the header
    for (const [synonym, field] of Object.entries(SYNONYMS)) {
      if (norm.includes(synonym) || synonym.includes(norm)) {
        return {
          originalHeader: header,
          mappedTo: field,
          confidence: 0.7,
          sampleValues: samples[header],
        };
      }
    }

    // Value-pattern detection
    const detected = detectFieldFromValues(samples[header]);
    if (detected) {
      return {
        originalHeader: header,
        mappedTo: detected.field,
        confidence: detected.confidence,
        sampleValues: samples[header],
      };
    }

    // No match
    return {
      originalHeader: header,
      mappedTo: null,
      confidence: 0,
      sampleValues: samples[header],
    };
  });

  // Second pass: resolve conflicts — only one column per field (highest confidence wins)
  const fieldWinners: Record<string, number> = {};
  for (let i = 0; i < rawMappings.length; i++) {
    const m = rawMappings[i];
    if (!m.mappedTo) continue;
    const existing = fieldWinners[m.mappedTo];
    if (existing === undefined || m.confidence > rawMappings[existing].confidence) {
      // This one wins — demote the previous winner
      if (existing !== undefined) {
        rawMappings[existing] = { ...rawMappings[existing], mappedTo: null, confidence: 0 };
      }
      fieldWinners[m.mappedTo] = i;
    } else {
      // This one loses
      rawMappings[i] = { ...m, mappedTo: null, confidence: 0 };
    }
  }

  // Special case: first name + last name → combine into name
  const firstNameIdx = headers.findIndex((h) => {
    const n = normalize(h);
    return n === 'first name' || n === 'firstname';
  });
  const lastNameIdx = headers.findIndex((h) => {
    const n = normalize(h);
    return n === 'last name' || n === 'lastname';
  });
  if (firstNameIdx >= 0 && lastNameIdx >= 0) {
    // Mark both as mapping to name with a special flag
    rawMappings[firstNameIdx] = {
      ...rawMappings[firstNameIdx],
      mappedTo: 'name',
      confidence: 1.0,
    };
    // Mark last name as skip — we'll handle combination in row mapping
    rawMappings[lastNameIdx] = {
      ...rawMappings[lastNameIdx],
      mappedTo: 'skip',
      confidence: 1.0,
    };
  }

  return rawMappings;
}

/**
 * Get the list of all possible fields for the mapping dropdown.
 */
export const ALL_MAPPABLE_FIELDS: { value: MappableField | null; label: string }[] = [
  { value: null, label: '— Skip —' },
  { value: 'name', label: 'Name' },
  { value: 'homeLocation', label: 'Home Location' },
  { value: 'university', label: 'University' },
  { value: 'program', label: 'Programme' },
  { value: 'company', label: 'Company' },
  { value: 'role', label: 'Role / Title' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'linkedinUrl', label: 'LinkedIn URL' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'notes', label: 'Notes' },
  { value: 'tags', label: 'Tags' },
  { value: 'classification', label: 'Classification' },
  { value: 'howMet', label: 'How Met' },
  { value: 'whereMet', label: 'Where Met' },
  { value: 'eventOrContext', label: 'Event / Context' },
  { value: 'dateMet', label: 'When Met' },
  { value: 'reconnectIntervalWeeks', label: 'Reconnect (weeks)' },
  { value: 'reconnectDate', label: 'Reconnect Date' },
  { value: 'skip', label: '— Skip —' },
];
