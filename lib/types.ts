export type InteractionType = 'coffee' | 'call' | 'event' | 'linkedin' | 'message' | 'other';

export interface Interaction {
  id: string;
  date: string;       // YYYY-MM-DD
  note: string;
  type?: InteractionType;
  duration?: string;
  initiator?: 'you' | 'them';
}

export interface PlannedInteraction {
  id: string;
  date: string;         // YYYY-MM-DD
  description: string;
  completed: boolean;
  outcomeLogged: boolean;
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

  reconnectIntervalWeeks: number | null; // null = no recurring reminder
  reconnectDate: string;                 // YYYY-MM-DD or '' — one-off reminder date
  lastContacted: string;                 // ISO date or ''
  interactions: Interaction[];

  education: Education[];
  jobs: Job[];
  plannedInteractions: PlannedInteraction[];

  dateAdded: string;
  lastUpdated: string;
  deleted?: boolean; // soft-delete flag — filtered out from UI but kept for sync
}

export type Tab = 'contacts' | 'network' | 'settings';

export type SortOrder = 'name' | 'dateAdded' | 'company' | 'lastContacted';

export interface AppSettings {
  reconnectRemindersEnabled: boolean;
  cloudSyncEnabled: boolean;
  sortOrder: SortOrder;
  emailNotificationsEnabled: boolean; // send email 2 days before + day of planned interactions
}

export type ActiveFilter = {
  classification: 'all' | 'inner' | 'wider';
  tags: string[];
  search: string;
  homeLocation: string | null;
  university: string | null;
  company: string | null;
};

export interface Education {
  id: string;
  university: string;
  program: string;
  gradYear: string;
  isPrimary: boolean;
}

export interface Job {
  id: string;
  company: string;
  role: string;
  isCurrent: boolean;
}

export interface UserProfile {
  name: string;
  photoUrl: string;
  phone: string;
  email: string;
  linkedinUrl: string;
  birthday: string;
  mainLocation: string;
  education: Education[];
  jobs: Job[];
  sharePhone: boolean;
  shareEmail: boolean;
  shareLinkedin: boolean;
  shareBirthday: boolean;
  shareLocation: boolean;
  shareEducation: boolean;
  shareJobs: boolean;
}
