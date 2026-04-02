import type { Contact, UserProfile } from './types';

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

export function encodeProfileForSharing(profile: UserProfile): string {
  const data: Record<string, unknown> = { name: profile.name || 'Me' };
  if (profile.sharePhone && profile.phone)           data.phone = profile.phone;
  if (profile.shareEmail && profile.email)           data.email = profile.email;
  if (profile.shareLinkedin && profile.linkedinUrl)  data.linkedinUrl = profile.linkedinUrl;
  if (profile.shareLocation && profile.mainLocation) data.homeLocation = profile.mainLocation;
  if (profile.shareEducation && profile.education.length > 0) {
    data.university = profile.education[0].university;
  }
  if (profile.shareJobs && profile.jobs.length > 0) {
    const current = profile.jobs.find((j) => j.isCurrent) ?? profile.jobs[0];
    data.role = current.role;
    data.company = current.company;
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

    // Map flat role/company into jobs array so the form shows them
    if ((data.role || data.company) && (!data.jobs || data.jobs.length === 0)) {
      data.jobs = [{
        id: Math.random().toString(36).slice(2, 10),
        role: data.role || '',
        company: data.company || '',
        isCurrent: true,
      }];
    }

    // Map flat university into education array
    if (data.university && (!data.education || data.education.length === 0)) {
      data.education = [{
        id: Math.random().toString(36).slice(2, 10),
        university: data.university,
        program: '',
        gradYear: '',
        isPrimary: true,
      }];
    }

    return data;
  } catch {
    return null;
  }
}
