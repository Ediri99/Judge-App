import type { Track } from '../types';

export const TRACK_CONFIG = {
  stalls: {
    id: 'stalls' as const,
    badgeClass: 'stalls',
    label: 'Stalls',
    itemType: 'stall' as const,
  },
  universities: {
    id: 'universities' as const,
    badgeClass: 'uni',
    label: 'Universities',
    itemType: 'entry' as const,
  },
};

export function getEntryIcon(entryType: 'product' | 'process') {
  return entryType === 'process' ? '⚙' : '▦';
}

export function getEntryTypeLabel(entryType: 'product' | 'process') {
  return entryType === 'process' ? 'Process' : 'Product';
}

export type TrackId = keyof typeof TRACK_CONFIG;

export function isTrack(value: string): value is Track {
  return value === 'stalls' || value === 'universities';
}
