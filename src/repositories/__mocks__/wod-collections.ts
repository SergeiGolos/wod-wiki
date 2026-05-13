/**
 * Manual mock for wod-collections to avoid import.meta.glob issues in tests
 */

import { vi } from 'vitest';

export interface WodCollectionItem {
  id: string;
  name: string;
  content: string;
  path: string;
}

export interface WodCollection {
  id: string;
  name: string;
  count: number;
  items: WodCollectionItem[];
  readme?: string;
  categories: string[];
}

const mockCollections: Record<string, WodCollection> = {
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

export const getWodCollection = vi.fn((slug: string): WodCollection | null => {
  return mockCollections[slug] || null;
});

export const __mockCollections = mockCollections;
