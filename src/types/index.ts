export type Track = 'stalls' | 'universities';

export interface EventDoc {
  id?: string;
  name: string;
  year: number;
  activeTrack: Track;
  enabledTracks: Track[];
  createdAt?: string;
}

export interface JudgeDoc {
  id?: string;
  displayName: string;
  email: string;
  role?: 'judge' | 'admin';
}

export interface HallDoc {
  id?: string;
  name: string;
  order?: number;
}

export interface StallCategoryDoc {
  id?: string;
  name: string;
  order?: number;
}

export interface StallCriterionDoc {
  id?: string;
  name: string;
  max: number;
  weight: number;
  order: number;
  track: Track;
}

export interface StallDoc {
  id?: string;
  eventId: string;
  hallId?: string;
  categoryId?: string;
  stallNo?: string;
  organization: string;
  imageUrl?: string | null;
}

export interface UniversityDoc {
  id?: string;
  eventId: string;
  name: string;
}

export interface AwardCategoryDoc {
  id?: string;
  eventId: string;
  name: string;
  type: 'product' | 'process';
  order: number;
}

export interface UniversityEntryDoc {
  id?: string;
  eventId: string;
  universityId: string;
  awardCategoryId: string;
  type: 'product' | 'process';
  name: string;
  imageUrl?: string | null;
}

export interface ScoreDoc {
  id?: string;
  eventId: string;
  track: Track;
  judgeId: string;
  itemId: string;
  itemType: 'stall' | 'entry';
  criteria: Record<string, number>;
  total: number;
  notes?: string;
  photos?: Array<{ url: string; storagePath: string; w?: number; h?: number }>;
  status: 'draft' | 'submitted';
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
