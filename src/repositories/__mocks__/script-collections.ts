/**
 * Manual mock for wod-collections to avoid import.meta.glob issues in tests
 */

import { vi } from 'vitest';

export interface ScriptCollectionItem {
  id: string;
  name: string;
  content: string;
  path: string;
}

export interface ScriptCollection {
  id: string;
  name: string;
  count: number;
  items: ScriptCollectionItem[];
  readme?: string;
  categories: string[];
}

const mockCollections: Record<string, ScriptCollection> = {
  cardio: {
    id: 'cardio',
    name: 'Cardio Workouts',
    count: 2,
    categories: ['endurance', 'hiit', 'conditioning'],
    items: [
      { id: '5k-run', name: '5K Run', content: '', path: '' },
      { id: 'intervals', name: 'Interval Training', content: '', path: '' },
    ],
  },
  strength: {
    id: 'strength',
    name: 'Strength Workouts',
    count: 2,
    categories: ['powerlifting', 'bodybuilding', 'strongman'],
    items: [
      { id: 'squat', name: 'Squat Day', content: '', path: '' },
      { id: 'bench', name: 'Bench Press', content: '', path: '' },
    ],
  },
};

export const getScriptCollection = vi.fn((slug: string): ScriptCollection | null => {
  return mockCollections[slug] || null;
});

export const __mockCollections = mockCollections;
