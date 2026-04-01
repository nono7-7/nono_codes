import type { Contact } from './types';

const SHAREABLE_FIELDS = [
  'name', 'role', 'company', 'university', 'homeLocation',
  'email', 'phone', 'linkedinUrl', 'photoUrl',
] as const;

type ShareableData = Pick<Contact, typeof SHAREABLE_FIELDS[number]>;

export function encodeContactForSharing(contact: Contact): string {
  const data: Partial<ShareableData> = {};
  for (const field of SHAREABLE_FIELDS) {
    const val = contact[field];
    if (val) data[field] = val;
  }
  const json = JSON.stringify(data);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?import=${encoded}`;
}

export function decodeSharedContact(importParam: string): Partial<Contact> | null {
  try {
    const json = decodeURIComponent(escape(atob(importParam)));
    const data = JSON.parse(json);
    if (typeof data !== 'object' || !data.name) return null;
    return data;
  } catch {
    return null;
  }
}
