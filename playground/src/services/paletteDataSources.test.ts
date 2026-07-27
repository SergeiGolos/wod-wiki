import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { WorkoutResult } from '@/types/storage';

/**
 * Unit tests for paletteDataSources.ts
 *
 * Tests cover:
 * - WOD block extraction from markdown
 * - Collection data source generation
 * - WOD block source generation
 * - Edge cases (empty inputs, malformed markdown, multiple blocks)
 * - Search query filtering
 *
 * Note: Functions that depend on IndexedDB, playgroundDB, or
 * import.meta.glob (like globalSearchSource, feedSource, journalHistorySource)
 * are tested through integration tests.
 */

// Mock IndexedDB and dependencies
global.indexedDB = {
  open: mock(() => ({
    onsuccess: null,
    onerror: null,
    onblocked: null,
    onupgradeneeded: null,
    result: {
      close: mock(),
      transaction: mock(() => ({
        objectStore: mock(() => ({
          get: mock(),
          put: mock(),
          delete: mock(),
          getAll: mock(),
          index: mock(() => ({
            getAll: mock(),
            openCursor: mock(),
          })),
        })),
      })),
    },
  })),
} as any;

const mockGetRecentResults = mock((): Promise<WorkoutResult[]> => Promise.resolve([]));
mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getRecentResults: mockGetRecentResults,
  },
}));

mock.module('./playgroundContent', () => ({
  pageId: (category: string, name: string) => `${category}/${name}`,
  playgroundContent: {
    getPagesByCategory: mock(() => Promise.resolve([])),
  },
}));

// Import after mocks are set up
const {
  extractScriptBlocks,
  scriptBlockSource,
  collectionSource,
  collectionItemsSource,
  globalSearchSource,
} = await import('./paletteDataSources');

type ExtractedScriptBlock = import('./paletteDataSources').ExtractedScriptBlock;
type WorkoutItem = import('./paletteDataSources').WorkoutItem;
type ScriptCollection = import('@/repositories/script-collections').ScriptCollection;

describe('extractScriptBlocks', () => {
  it('should extract single wod block from markdown', () => {
    const markdown = '```wod\n5 rounds for time:\n- 10 thrusters\n- 15 pull-ups\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('wod');
    expect(blocks[0].script).toBe('5 rounds for time:\n- 10 thrusters\n- 15 pull-ups\n');
    expect(blocks[0].preview).toBe('5 rounds for time:');
  });

  it('should extract multiple wod blocks', () => {
    const markdown = '```wod\nFirst workout\n```\n\nSome text in between\n\n```wod\nSecond workout\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].script).toBe('First workout\n');
    expect(blocks[1].script).toBe('Second workout\n');
  });

  it('should extract log blocks', () => {
    const markdown = '```log\nRound 1: 2:30\nRound 2: 2:45\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('log');
    expect(blocks[0].script).toBe('Round 1: 2:30\nRound 2: 2:45\n');
  });

  it('should extract plan blocks', () => {
    const markdown = '```plan\nWeek 1: Foundation\nWeek 2: Build\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('plan');
    expect(blocks[0].script).toBe('Week 1: Foundation\nWeek 2: Build\n');
  });

  it('should extract mixed block types', () => {
    const markdown = '```wod\nWorkout\n```\n\n```log\nLog notes\n```\n\n```plan\nPlan notes\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].dialect).toBe('wod');
    expect(blocks[1].dialect).toBe('log');
    expect(blocks[2].dialect).toBe('plan');
  });

  it('should normalize ```whiteboard to wod dialect', () => {
    const markdown = '```whiteboard\n5 rounds for time:\n- 10 thrusters\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('wod');
    expect(blocks[0].script).toBe('5 rounds for time:\n- 10 thrusters\n');
  });

  it('should extract mixed wod + whiteboard fences (both normalize to wod)', () => {
    const markdown = '```wod\nFirst\n```\n\n```whiteboard\nSecond\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].dialect).toBe('wod');
    expect(blocks[1].dialect).toBe('wod');
  });

  it('should handle empty block content', () => {
    const markdown = '```wod\n\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].script).toBe('\n');
    expect(blocks[0].preview).toBe('(empty block)');
  });

  it('should handle block with only whitespace', () => {
    const markdown = '```wod\n  \n  \n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].script).toBe('  \n  \n');
    expect(blocks[0].preview).toBe('(empty block)');
  });

  it('should handle Windows line endings (\\r\\n)', () => {
    const markdown = '```wod\r\n5 rounds for time\r\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].script).toBe('5 rounds for time\r\n');
  });

  it('should return empty array when no blocks found', () => {
    const markdown = '# Just heading\n\nNo code blocks here.';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toEqual([]);
  });

  it('should ignore non-wod/log/plan code blocks', () => {
    const markdown = '```javascript\nconst x = 5;\n```\n\n```wod\nReal workout\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('wod');
    expect(blocks[0].script).toBe('Real workout\n');
  });

  it('should handle case-insensitive block types', () => {
    const markdown = '```WOD\nUppercase WOD\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].dialect).toBe('wod');
  });

  it('should handle blocks with inline backticks', () => {
    const markdown = '```wod\nDo 5 `heavy` thrusters\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].script).toContain('`heavy`');
  });

  it('should number blocks sequentially', () => {
    const markdown = '```wod\nBlock 1\n```\n\n```wod\nBlock 2\n```\n\n```wod\nBlock 3\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].index).toBe(0);
    expect(blocks[1].index).toBe(1);
    expect(blocks[2].index).toBe(2);
  });

  it('should extract preview from first non-empty line', () => {
    const markdown = '```wod\n\n\nThird line is first\n```';
    const blocks = extractScriptBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].preview).toBe('Third line is first');
  });
});

describe('scriptBlockSource', () => {
  it('should create source with single block when workout has one block', async () => {
    const markdown = '```wod\n5 rounds for time\n```';
    const source = scriptBlockSource('Fran', markdown);

    const results = await source.search('');
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Fran');
    expect(results[0].payload).toEqual({
      index: 0,
      script: '5 rounds for time\n',
      preview: '5 rounds for time',
      dialect: 'wod',
    });
  });

  it('should create source with multiple blocks when workout has multiple blocks', async () => {
    const markdown = '```wod\nFirst block\n```\n\n```wod\nSecond block\n```';
    const source = scriptBlockSource('Workout', markdown);

    const results = await source.search('');
    expect(results).toHaveLength(2);
    expect(results[0].label).toBe('Block 1: First block');
    expect(results[1].label).toBe('Block 2: Second block');
  });

  it('should return empty array when no blocks found', async () => {
    const markdown = '# No blocks here';
    const source = scriptBlockSource('Empty', markdown);

    const results = await source.search('');
    expect(results).toEqual([]);
  });

  it('should filter blocks by search query', async () => {
    const markdown = '```wod\nThrusters and pull-ups\n```\n\n```wod\nClean and jerk\n```';
    const source = scriptBlockSource('Workout', markdown);

    const results = await source.search('thruster');
    expect(results).toHaveLength(1);
    expect(results[0].label).toContain('Thrusters');
  });

  it('should handle case-insensitive search', async () => {
    const markdown = '```wod\nThrusters and pull-ups\n```';
    const source = scriptBlockSource('Workout', markdown);

    const results = await source.search('THRUSTER');
    expect(results).toHaveLength(1);
  });

  it('should match against sublabel in search', async () => {
    const markdown = '```wod\nFirst workout\n```\n\n```wod\nSecond workout\n```';
    const source = scriptBlockSource('Workout', markdown);

    const results = await source.search('second');
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Block 2: Second workout');
  });
});

describe('collectionSource', () => {
  const mockItems: WorkoutItem[] = [
    { id: 'fran', name: 'Fran', category: 'girls' },
    { id: 'grace', name: 'Grace', category: 'girls' },
    { id: 'murph', name: 'Murph', category: 'heroes' },
  ];

  it('should filter items by collection name', async () => {
    const source = collectionSource('girls', mockItems);
    const results = await source.search('');

    expect(results).toHaveLength(2);
    expect(results.every(r => r.payload.category === 'girls')).toBe(true);
  });

  it('should include item name and category in results', async () => {
    const source = collectionSource('girls', mockItems);
    const results = await source.search('');

    expect(results[0].label).toBe('Fran');
    expect(results[0].sublabel).toBe('girls');
    expect(results[0].payload).toEqual(mockItems[0]);
  });

  it('should filter by search query', async () => {
    const source = collectionSource('girls', mockItems);
    const results = await source.search('grace');

    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Grace');
  });

  it('should handle case-insensitive search', async () => {
    const source = collectionSource('girls', mockItems);
    const results = await source.search('GRACE');

    expect(results).toHaveLength(1);
  });

  it('should return empty array when no items match collection', async () => {
    const source = collectionSource('non-existent', mockItems);
    const results = await source.search('');

    expect(results).toEqual([]);
  });

  it('should return empty array when no items match search query', async () => {
    const source = collectionSource('girls', mockItems);
    const results = await source.search('non-existent');

    expect(results).toEqual([]);
  });

  it('should handle empty items array', async () => {
    const source = collectionSource('girls', []);
    const results = await source.search('');

    expect(results).toEqual([]);
  });

  it('should not filter items by searchHidden flag (collectionSource does not use it)', async () => {
    const itemsWithHidden: WorkoutItem[] = [
      { id: 'fran', name: 'Fran', category: 'girls' },
      { id: 'secret', name: 'Secret', category: 'girls', searchHidden: true },
    ];
    const source = collectionSource('girls', itemsWithHidden);
    const results = await source.search('');

    expect(results).toHaveLength(2);
  });
});

describe('collectionItemsSource', () => {
  const mockCollection: ScriptCollection = {
    id: 'crossfit-girls',
    name: 'CrossFit Girls',
    categories: ['crossfit'],
    count: 2,
    items: [
      { id: 'fran', name: 'Fran', content: '21-15-9', path: 'fran.md' },
      { id: 'grace', name: 'Grace', content: '30 clean & jerks', path: 'grace.md' },
    ],
  };

  it('should return all collection items', async () => {
    const source = collectionItemsSource(mockCollection);
    const results = await source.search('');

    expect(results).toHaveLength(2);
  });

  it('should include item details in results', async () => {
    const source = collectionItemsSource(mockCollection);
    const results = await source.search('');

    expect(results[0].id).toBe('fran');
    expect(results[0].label).toBe('Fran');
    expect(results[0].sublabel).toBe('CrossFit Girls');
    expect(results[0].category).toBe('CrossFit Girls');
    expect(results[0].payload).toEqual(mockCollection.items[0]);
  });

  it('should filter items by search query on name', async () => {
    const source = collectionItemsSource(mockCollection);
    const results = await source.search('grace');

    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Grace');
  });

  it('should filter items by search query on id', async () => {
    const source = collectionItemsSource(mockCollection);
    const results = await source.search('fran');

    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Fran');
  });

  it('should handle case-insensitive search', async () => {
    const source = collectionItemsSource(mockCollection);
    const results = await source.search('GRACE');

    expect(results).toHaveLength(1);
  });

  it('should return empty array when collection has no items', async () => {
    const emptyCollection: ScriptCollection = {
      id: 'empty',
      name: 'Empty',
      categories: [],
      count: 0,
      items: [],
    };
    const source = collectionItemsSource(emptyCollection);
    const results = await source.search('');

    expect(results).toEqual([]);
  });

  it('should return empty array when no items match search query', async () => {
    const source = collectionItemsSource(mockCollection);
    const results = await source.search('non-existent');

    expect(results).toEqual([]);
  });

  it('should handle partial matches', async () => {
    const source = collectionItemsSource(mockCollection);
    const results = await source.search('gr');

    expect(results).toHaveLength(1); // Only Grace contains 'gr'
    expect(results[0].label).toBe('Grace');
  });

  it('should set source ID based on collection ID', async () => {
    const source = collectionItemsSource(mockCollection);

    expect(source.id).toBe('collection-items:crossfit-girls');
  });

  it('should set source label to collection name', async () => {
    const source = collectionItemsSource(mockCollection);

    expect(source.label).toBe('CrossFit Girls');
  });
});

describe('globalSearchSource', () => {
  const createResult = (overrides: Partial<WorkoutResult> & { id: string; noteId: string }): WorkoutResult => ({
    createdAt: Date.now(),
    data: { startTime: 0, endTime: 60_000, duration: 60_000, completed: true, logs: [] },
    ...overrides,
  });

  beforeEach(() => {
    mockGetRecentResults.mockResolvedValue([]);
  });

  it('excludes playground results by default', async () => {
    mockGetRecentResults.mockResolvedValue([
      createResult({
        id: 'r-journal',
        noteId: 'journal/2024-01-15',
        createdAt: new Date('2024-01-15T10:30:00').getTime(),
      }),
      createResult({
        id: 'r-playground',
        noteId: 'playground/abc-123',
        createdAt: new Date('2024-01-14T10:30:00').getTime(),
      }),
    ]);

    const source = globalSearchSource([]);
    const results = await source.search('');

    expect(results.some(r => r.id === 'r-journal')).toBe(true);
    expect(results.some(r => r.id === 'r-playground')).toBe(false);
  });

  it('includes playground results when showPlaygrounds is true', async () => {
    mockGetRecentResults.mockResolvedValue([
      createResult({
        id: 'r-playground',
        noteId: 'playground/abc-123',
        createdAt: new Date('2024-01-14T10:30:00').getTime(),
      }),
    ]);

    const source = globalSearchSource([], undefined, true);
    const results = await source.search('');

    expect(results.some(r => r.id === 'r-playground')).toBe(true);
  });

  it('treats legacy bare UUID noteIds as journal, not playground', async () => {
    mockGetRecentResults.mockResolvedValue([
      createResult({
        id: 'r-legacy',
        noteId: '00000000-0000-4000-8000-000000000001',
        createdAt: new Date('2024-01-15T10:30:00').getTime(),
      }),
    ]);

    const source = globalSearchSource([]);
    const results = await source.search('');

    expect(results.some(r => r.id === 'r-legacy')).toBe(true);
  });

  it('respects the explicit origin field over noteId prefix', async () => {
    mockGetRecentResults.mockResolvedValue([
      createResult({
        id: 'r-journal-origin',
        noteId: 'playground/abc-123',
        origin: 'journal',
        createdAt: new Date('2024-01-15T10:30:00').getTime(),
      }),
    ]);

    const source = globalSearchSource([]);
    const results = await source.search('');

    expect(results.some(r => r.id === 'r-journal-origin')).toBe(true);
  });
});
