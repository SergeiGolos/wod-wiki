/**
 * Test setup for navigation panel tests
 * Configure mocks before modules load
 */

import { beforeAll } from 'bun:test';

// Mock the collections repository before any imports
beforeAll(() => {
  // This will be called before tests run
  global.mockCollections = {
    cardio: {
      id: 'cardio',
      name: 'Cardio Workouts',
      categories: ['endurance', 'hiit', 'conditioning'],
      items: [
        { id: '5k-run', name: '5K Run' },
        { id: 'intervals', name: 'Interval Training' },
      ],
    },
    strength: {
      id: 'strength',
      name: 'Strength Workouts',
      categories: ['powerlifting', 'bodybuilding', 'strongman'],
      items: [
        { id: 'squat', name: 'Squat Day' },
        { id: 'bench', name: 'Bench Press' },
      ],
    },
  };
});
