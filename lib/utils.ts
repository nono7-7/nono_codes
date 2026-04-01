import type { Contact, ActiveFilter, SortOrder } from './types';

export const DEFAULT_TAGS = [
  'finance', 'tech', 'vc', 'startup', 'consulting', 'legal',
  'real estate', 'media', 'healthcare', 'crypto', 'university',
  'conference', 'mutual friend', 'mentor', 'investor', 'co-founder potential',
];

export function capitalizeTag(tag: string): string {
  return tag
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function filterContacts(contacts: Contact[], filter: ActiveFilter): Contact[] {
  let result = contacts;

  if (filter.classification !== 'all') {
    result = result.filter((c) => c.classification === filter.classification);
  }

  if (filter.tag) {
    result = result.filter((c) => c.tags.includes(filter.tag!));
  }

  if (filter.search.trim()) {
    const q = filter.search.toLowerCase();
    result = result.filter((c) => {
      const searchable = [
        c.name, c.company, c.university, c.role, c.howMet, c.whereMet,
        c.eventOrContext, c.homeLocation, c.nationality, c.dateMet,
        c.notes, ...c.tags,
      ].join(' ').toLowerCase();
      return searchable.includes(q);
    });
  }

  return result;
}

export function sortContacts(contacts: Contact[], sortOrder: SortOrder): Contact[] {
  return [...contacts].sort((a, b) => {
    switch (sortOrder) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'dateAdded':
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      case 'company':
        if (!a.company && !b.company) return a.name.localeCompare(b.name);
        if (!a.company) return 1;
        if (!b.company) return -1;
        return a.company.localeCompare(b.company) || a.name.localeCompare(b.name);
      case 'lastContacted':
        if (!a.lastContacted && !b.lastContacted) return a.name.localeCompare(b.name);
        if (!a.lastContacted) return 1;
        if (!b.lastContacted) return -1;
        return new Date(b.lastContacted).getTime() - new Date(a.lastContacted).getTime();
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

export function getOverdueContacts(contacts: Contact[]): Contact[] {
  const now = Date.now();
  return contacts
    .filter((c) => {
      if (!c.reconnectIntervalWeeks) return false;
      const intervalMs = c.reconnectIntervalWeeks * 7 * 24 * 60 * 60 * 1000;
      const lastDate = c.lastContacted ? new Date(c.lastContacted).getTime() : 0;
      return now - lastDate > intervalMs;
    })
    .sort((a, b) => {
      const aLast = a.lastContacted ? new Date(a.lastContacted).getTime() : 0;
      const bLast = b.lastContacted ? new Date(b.lastContacted).getTime() : 0;
      return aLast - bLast; // most overdue first
    });
}

export function getTopTags(contacts: Contact[], limit = 5): string[] {
  const freq: Record<string, number> = {};
  for (const c of contacts) {
    for (const t of c.tags) {
      freq[t] = (freq[t] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function buildHowMetSentence(contact: Contact): string {
  const parts: string[] = [];

  if (contact.eventOrContext) {
    parts.push(`Met at ${contact.eventOrContext}`);
  }
  if (contact.whereMet) {
    parts.push(`in ${contact.whereMet}`);
  }
  if (contact.dateMet) {
    if (parts.length > 0) {
      parts.push(`(${contact.dateMet})`);
    } else {
      parts.push(contact.dateMet);
    }
  }
  if (contact.howMet) {
    if (parts.length > 0) {
      parts.push(`— ${contact.howMet}`);
    } else {
      parts.push(contact.howMet);
    }
  }

  return parts.join(' ');
}

export function createEmptyContact(): Omit<Contact, 'id' | 'dateAdded' | 'lastUpdated'> {
  return {
    name: '',
    role: '',
    company: '',
    university: '',
    classification: 'wider',
    howMet: '',
    whereMet: '',
    eventOrContext: '',
    dateMet: '',
    homeLocation: '',
    nationality: '',
    linkedinUrl: '',
    phone: '',
    email: '',
    notes: '',
    birthday: '',
    tags: [],
    photoUrl: '',
    reconnectIntervalWeeks: null,
    lastContacted: '',
    interactions: [],
  };
}
