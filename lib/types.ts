export interface Interaction {
  id: string;
  date: string;       // YYYY-MM-DD
  note: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  company: string;
  university: string;
  classification: 'inner' | 'wider';

  howMet: string;
  whereMet: string;
  eventOrContext: string;
  dateMet: string;

  homeLocation: string;
  nationality: string;
  linkedinUrl: string;
  phone: string;
  email: string;

  notes: string;
  birthday: string; // YYYY-MM-DD or empty

  tags: string[];

  photoUrl: string; // base64 data URL or ''

  reconnectIntervalWeeks: number | null; // null = no reminder
  lastContacted: string;                 // ISO date or ''
  interactions: Interaction[];

  dateAdded: string;
  lastUpdated: string;
}

export type Tab = 'contacts' | 'network' | 'settings';

export type SortOrder = 'name' | 'dateAdded' | 'company' | 'lastContacted';

export interface AppSettings {
  reconnectRemindersEnabled: boolean;
  cloudSyncEnabled: boolean;
  sortOrder: SortOrder;
}

export type ActiveFilter = {
  classification: 'all' | 'inner' | 'wider';
  tag: string | null;
  search: string;
};
