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
          { id: 'Event-04', name: 'Event 04', content: 'Event 4 content', path: 'Event-04.md' },
          { id: 'Event-05', name: 'Event 05', content: 'Event 5 content', path: 'Event-05.md' },
          { id: 'Event-06', name: 'Event 06', content: 'Event 6 content', path: 'Event-06.md' },
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
    expect(savedPages[0]?.content).toContain('## Event-05');
    expect(savedPages[0]?.content).toContain('```wod');
    expect(savedPages[0]?.content).toContain('5 rounds');
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

  it('creates a new journal entry when one does not exist', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Test Workout',
      category: 'test-collection',
      wodContent: 'Test content',
      date: new Date('2024-01-15T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.id).toBe('journal/2024-01-15');
    expect(savedPages[0]?.name).toBe('2024-01-15');
    expect(savedPages[0]?.category).toBe('journal');
    expect(savedPages[0]?.content).toContain('# 2024-01-15');
  });

  it('appends to an existing journal entry', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    // Create an existing journal entry
    existingPages.set('journal/2024-01-15', {
      id: 'journal/2024-01-15',
      name: '2024-01-15',
      category: 'journal',
      content: '# 2024-01-15\n\nExisting content',
      updatedAt: 1_714_476_000_000,
    });

    await appendWorkoutToJournal({
      workoutName: 'New Workout',
      category: 'test',
      wodContent: 'New content',
      date: new Date('2024-01-15T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.content).toContain('Existing content');
    expect(savedPages[0]?.content).toContain('## New Workout');
  });

  it('uses current date when no date is provided', async () => {
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Holiday Workout',
      category: 'holiday',
      wodContent: 'Festive fitness',
    });

    expect(savedPages).toHaveLength(1);
    // Verify it's in YYYY-MM-DD format and starts with 'journal/'
    expect(savedPages[0]?.id).toMatch(/^journal\/\d{4}-\d{2}-\d{2}$/);
    expect(savedPages[0]?.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('wraps content in wod block by default', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Wod Test',
      category: 'test',
      wodContent: '5 rounds for time',
      date: new Date('2024-01-15T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.content).toContain('```wod');
    expect(savedPages[0]?.content).toContain('5 rounds for time');
    expect(savedPages[0]?.content).toContain('```');
  });

  it('does not wrap content when wrapInWod is false', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Plain Test',
      category: 'test',
      wodContent: 'Plain content',
      date: new Date('2024-01-15T12:00:00Z'),
      wrapInWod: false,
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.content).not.toContain('```wod');
    expect(savedPages[0]?.content).toContain('Plain content');
  });

  it('handles collections that do not exist', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Orphan Workout',
      category: 'non-existent-collection',
      wodContent: 'No collection',
      date: new Date('2024-01-15T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.content).toContain('## Orphan Workout');
    expect(savedPages[0]?.content).not.toContain('Collection:');
  });

  it('trims trailing whitespace from wod content', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Whitespace Test',
      category: 'test',
      wodContent: 'Content with trailing spaces   ',
      date: new Date('2024-01-15T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.content).toContain('Content with trailing spaces');
    // Should not have extra spaces after trimming
    expect(savedPages[0]?.content).not.toContain('Content with trailing spaces   ');
  });

  it('handles special characters in workout names', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Workout with "quotes" & <special>',
      category: 'test',
      wodContent: 'Test',
      date: new Date('2024-01-15T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.content).toContain('## Workout with "quotes" & <special>');
  });

  it('handles leap year dates', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Leap Day Workout',
      category: 'test',
      wodContent: 'Leap fitness',
      date: new Date('2024-02-29T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.id).toBe('journal/2024-02-29');
  });

  it('handles single-digit month and day padding', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Early Year Workout',
      category: 'test',
      wodContent: 'January fitness',
      date: new Date('2024-01-01T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.id).toBe('journal/2024-01-01');
    expect(savedPages[0]?.name).toBe('2024-01-01');
  });

  it('handles multi-line wod content', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    const multiLineContent = `5 rounds for time:
- 10 thrusters (95/65 lb)
- 15 pull-ups
Rest 3 minutes between rounds`;

    await appendWorkoutToJournal({
      workoutName: 'Multi-line Test',
      category: 'test',
      wodContent: multiLineContent,
      date: new Date('2024-01-15T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.content).toContain(multiLineContent);
  });

  it('sets updatedAt timestamp correctly', async () => {
    const expectedTimestamp = 1_714_476_000_000;
    Date.now = () => expectedTimestamp;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    await appendWorkoutToJournal({
      workoutName: 'Timestamp Test',
      category: 'test',
      wodContent: 'Test',
      date: new Date('2024-01-15T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    expect(savedPages[0]?.updatedAt).toBe(expectedTimestamp);
  });

  it('trims existing content before appending', async () => {
    Date.now = () => 1_714_476_000_000;
    const { appendWorkoutToJournal } = await journalWorkoutModule;

    // Create an existing entry with trailing whitespace
    existingPages.set('journal/2024-01-15', {
      id: 'journal/2024-01-15',
      name: '2024-01-15',
      category: 'journal',
      content: '# 2024-01-15\n\nOld content   ',
      updatedAt: 1_714_476_000_000,
    });

    await appendWorkoutToJournal({
      workoutName: 'New Workout',
      category: 'test',
      wodContent: 'New content',
      date: new Date('2024-01-15T12:00:00Z'),
    });

    expect(savedPages).toHaveLength(1);
    // Should not have the trailing whitespace from old content
    expect(savedPages[0]?.content).not.toMatch(/Old content   \n/);
  });
});