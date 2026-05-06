import { afterEach, describe, expect, it, mock } from 'bun:test';

interface SavedPage {
  id: string;
  category: string;
  name: string;
  content: string;
  updatedAt: number;
}

const savedPages: SavedPage[] = [];
const existingPages = new Map<string, SavedPage>();

mock.module('@/repositories/wod-collections', () => ({
  getWodCollection: (id: string) => {
    if (id === 'crossfit-games-2021') {
      return {
        id: 'crossfit-games-2021',
        name: 'Crossfit Games 2021',
        count: 3,
        categories: ['crossfit'],
        items: [
          { id: 'Event-04', name: 'Event 04', content: '', path: 'Event-04.md' },
          { id: 'Event-05', name: 'Event 05', content: '', path: 'Event-05.md' },
          { id: 'Event-06', name: 'Event 06', content: '', path: 'Event-06.md' },
        ],
      };
    }

    return undefined;
  },
}));

mock.module('./playgroundDB', () => ({
  PlaygroundDBService: {
    pageId: (category: string, name: string) => `${category}/${name}`,
  },
  playgroundDB: {
    getPage: async (id: string) => existingPages.get(id),
    savePage: async (page: SavedPage) => {
      savedPages.push(page);
      return page.id;
    },
  },
}));

const journalWorkoutModule = import('./journalWorkout');
const originalDateNow = Date.now;

afterEach(() => {
  Date.now = originalDateNow;
  savedPages.length = 0;
  existingPages.clear();
});

describe('appendWorkoutToJournal', () => {
  it('writes the backlink to the source workout note when provided', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Event-05',
      category: 'crossfit-games-2021',
      sourceNoteLabel: 'crossfit-games-2021-Event-05',
      sourceNotePath: '/workout/crossfit-games-2021/Event-05',
      wodContent: '5 rounds',
      date: new Date('2026-05-05T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.content).toContain('Source: [crossfit-games-2021-Event-05](/workout/crossfit-games-2021/Event-05)');
    expect(savedPages[0]?.content).toContain('Collection: [crossfit-games-2021](/collections/crossfit-games-2021)');
    expect(savedPages[0]?.content).toContain('[crossfit-games-2021-Event-04](/workout/crossfit-games-2021/Event-04)');
    expect(savedPages[0]?.content).toContain('[crossfit-games-2021-Event-06](/workout/crossfit-games-2021/Event-06)');
    expect(savedPages[0]?.content).not.toContain('[crossfit-games-2021-Event-05](/workout/crossfit-games-2021/Event-05) ·');
    expect(savedPages[0]?.content).not.toContain('Source: [crossfit-games-2021](/collections/crossfit-games-2021)');
  });

  it('falls back to the category route when no explicit source note is provided', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Fran',
      category: 'crossfit-girls',
      wodContent: '21-15-9 thrusters',
      date: new Date('2026-05-05T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.content).toContain('Source: [crossfit-girls](/collections/crossfit-girls)');
  });
});