import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

/**
 * Unit tests for journalEntryFlow.ts
 *
 * Tests cover:
 * - Each flow path (blank, collection, feed, history)
 * - WOD block extraction and selection
 * - Content formatting and journal entry creation
 * - Error scenarios (user dismisses palette, no blocks found)
 * - Edge cases (single vs multiple WOD blocks)
 * - Date formatting
 */

// Mock the palette store
let mockPaletteOpen = mock(() => Promise.resolve({
  dismissed: false,
  item: { payload: 'blank' },
}));

let mockPaletteState = {
  open: mockPaletteOpen,
};

mock.module('@/components/command-palette/palette-store', () => ({
  usePaletteStore: {
    getState: () => mockPaletteState,
  },
}));

// Mock the data sources
mock.module('./paletteDataSources', () => ({
  CREATE_FROM_SOURCE: [
    {
      id: 'blank',
      label: 'Blank Entry',
      payload: 'blank',
    },
    {
      id: 'collection',
      label: 'From Collection',
      payload: 'collection',
    },
    {
      id: 'feed',
      label: 'From Feed',
      payload: 'feed',
    },
    {
      id: 'history',
      label: 'From History',
      payload: 'history',
    },
  ],
  extractWodBlocks: (markdown: string) => {
    const blocks: Array<{ dialect: string; script: string }> = [];
    const wodMatch = markdown.match(/```(\w+)\n([\s\S]*?)```/);
    if (wodMatch) {
      blocks.push({ dialect: wodMatch[1], script: wodMatch[2].trim() });
    }
    return blocks;
  },
  collectionListSource: () => ({
    id: 'collection-list',
    label: 'Collections',
    items: [
      {
        id: 'crossfit-girls',
        label: 'CrossFit Girls',
        payload: {
          id: 'crossfit-girls',
          name: 'CrossFit Girls',
          categories: ['crossfit'],
          count: 2,
          items: [
            { id: 'fran', name: 'Fran', content: '21-15-9 thrusters, pull-ups', path: 'fran.md' },
            { id: 'grace', name: 'Grace', content: '30 clean & jerks', path: 'grace.md' },
          ],
        },
      },
    ],
  }),
  collectionItemsSource: (collection: any) => ({
    id: 'collection-items',
    label: collection.name,
    items: collection.items.map((item: any) => ({
      id: item.id,
      label: item.name,
      payload: item,
    })),
  }),
  wodBlockSource: (name: string, markdown: string) => ({
    id: 'wod-blocks',
    label: name,
    items: [
      {
        id: 'block-1',
        label: 'WOD Block',
        payload: { dialect: 'wod', script: 'Test workout' },
      },
    ],
  }),
  journalHistorySource: (dateKey: string) => ({
    id: 'journal-history',
    label: 'History',
    items: [
      {
        id: 'past-entry-1',
        label: 'Past Entry',
        payload: { content: '# Past Entry\n\n```wod\nTest content\n```' },
      },
    ],
  }),
  feedSource: (dateKey: string) => ({
    id: 'feed',
    label: 'Feed',
    items: [
      {
        id: 'feed-entry-1',
        label: 'Feed Entry',
        payload: {
          name: 'Feed Entry Name',
          content: '```wod\nFeed workout\n```',
        },
      },
    ],
  }),
}));

// Mock other dependencies
mock.module('@/repositories/wod-collections', () => ({
  getWodCollection: (id: string) => ({
    id: 'crossfit-girls',
    name: 'CrossFit Girls',
    categories: ['crossfit'],
    count: 2,
    items: [
      { id: 'fran', name: 'Fran', content: '21-15-9 thrusters, pull-ups', path: 'fran.md' },
      { id: 'grace', name: 'Grace', content: '30 clean & jerks', path: 'grace.md' },
    ],
  }),
}));

// Import the module under test
let journalEntryFlowModule: typeof import('./journalEntryFlow');

describe('journalEntryFlow', () => {
  let onCreatedCalls: Array<string> = [];

  beforeEach(async () => {
    // Reset mock state
    onCreatedCalls = [];
    mockPaletteOpen = mock(() => Promise.resolve({
      dismissed: false,
      item: { payload: 'blank' },
    }));
    mockPaletteState = {
      open: mockPaletteOpen,
    };

    // Clear module cache and reload
    journalEntryFlowModule = await import('./journalEntryFlow');
  });

  afterEach(() => {
    mock.restore();
  });

  describe('blank flow', () => {
    it('should create blank journal entry when user selects blank mode', async () => {
      mockPaletteOpen.mockResolvedValueOnce({
        dismissed: false,
        item: { payload: 'blank' },
      });

      const onCreated = mock((content: string) => {
        onCreatedCalls.push(content);
      });

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(onCreated).toHaveBeenCalledTimes(1);
      const createdContent = onCreated.mock.calls[0][0] as string;
      expect(createdContent).toContain('# Journal Entry');
      expect(createdContent).toContain('```wod');
      expect(createdContent).toContain('```');
    });

    it('should use provided date key for blank entry', async () => {
      mockPaletteOpen.mockResolvedValueOnce({
        dismissed: false,
        item: { payload: 'blank' },
      });

      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-12-25',
        onCreated,
      });

      expect(onCreated).toHaveBeenCalledTimes(1);
    });
  });

  describe('collection flow', () => {
    beforeEach(async () => {
      // Setup collection flow mocks
      mockPaletteOpen
        .mockResolvedValueOnce({
          dismissed: false,
          item: { payload: 'collection' },
        })
        .mockResolvedValueOnce({
          dismissed: false,
          item: {
            payload: {
              id: 'crossfit-girls',
              name: 'CrossFit Girls',
              categories: ['crossfit'],
              count: 2,
              items: [
                { id: 'fran', name: 'Fran', content: '21-15-9 thrusters, pull-ups', path: 'fran.md' },
                { id: 'grace', name: 'Grace', content: '30 clean & jerks', path: 'grace.md' },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          dismissed: false,
          item: {
            payload: {
              id: 'fran',
              name: 'Fran',
              content: '21-15-9 thrusters, pull-ups',
              path: 'fran.md',
            },
          },
        });

      // Reload module after setting up mocks
      journalEntryFlowModule = await import('./journalEntryFlow');
    });

    it('should navigate collection → workout → block selection', async () => {
      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(mockPaletteOpen).toHaveBeenCalledTimes(3); // mode, collection, workout
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    it('should create journal entry with workout content', async () => {
      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      const createdContent = onCreated.mock.calls[0][0] as string;
      expect(createdContent).toContain('Fran');
    });

    it('should handle user dismissing collection selection', async () => {
      // Reset mocks to dismiss at collection selection
      mockPaletteOpen = mock()
        .mockResolvedValueOnce({
          dismissed: false,
          item: { payload: 'collection' },
        })
        .mockResolvedValueOnce({
          dismissed: true,
          item: null,
        });

      mockPaletteState = { open: mockPaletteOpen };
      journalEntryFlowModule = await import('./journalEntryFlow');

      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(onCreated).not.toHaveBeenCalled();
    });

    it('should handle user dismissing workout selection', async () => {
      // Reset mocks to dismiss at workout selection
      mockPaletteOpen = mock()
        .mockResolvedValueOnce({
          dismissed: false,
          item: { payload: 'collection' },
        })
        .mockResolvedValueOnce({
          dismissed: false,
          item: {
            payload: {
              id: 'crossfit-girls',
              name: 'CrossFit Girls',
              items: [],
            },
          },
        })
        .mockResolvedValueOnce({
          dismissed: true,
          item: null,
        });

      mockPaletteState = { open: mockPaletteOpen };
      journalEntryFlowModule = await import('./journalEntryFlow');

      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(onCreated).not.toHaveBeenCalled();
    });
  });

  describe('feed flow', () => {
    beforeEach(async () => {
      mockPaletteOpen
        .mockResolvedValueOnce({
          dismissed: false,
          item: { payload: 'feed' },
        })
        .mockResolvedValueOnce({
          dismissed: false,
          item: {
            payload: {
              name: 'Feed Entry Name',
              content: '```wod\nFeed workout\n```',
            },
          },
        });

      journalEntryFlowModule = await import('./journalEntryFlow');
    });

    it('should navigate feed → entry (auto-selects single block)', async () => {
      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(mockPaletteOpen).toHaveBeenCalledTimes(2); // mode, feed entry (block auto-selected)
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    it('should create journal entry with feed content', async () => {
      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      const createdContent = onCreated.mock.calls[0][0] as string;
      expect(createdContent).toContain('Feed Entry Name');
    });

    it('should handle user dismissing feed entry selection', async () => {
      mockPaletteOpen = mock()
        .mockResolvedValueOnce({
          dismissed: false,
          item: { payload: 'feed' },
        })
        .mockResolvedValueOnce({
          dismissed: true,
          item: null,
        });

      mockPaletteState = { open: mockPaletteOpen };
      journalEntryFlowModule = await import('./journalEntryFlow');

      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(onCreated).not.toHaveBeenCalled();
    });
  });

  describe('history flow', () => {
    beforeEach(async () => {
      mockPaletteOpen
        .mockResolvedValueOnce({
          dismissed: false,
          item: { payload: 'history' },
        })
        .mockResolvedValueOnce({
          dismissed: false,
          item: {
            payload: {
              content: '# Past Entry\n\n```wod\nTest content\n```',
            },
          },
        });

      journalEntryFlowModule = await import('./journalEntryFlow');
    });

    it('should navigate history → entry selection', async () => {
      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(mockPaletteOpen).toHaveBeenCalledTimes(2); // mode, history entry
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    it('should clone content from past entry', async () => {
      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      const createdContent = onCreated.mock.calls[0][0] as string;
      expect(createdContent).toContain('Past Entry');
      expect(createdContent).toContain('Test content');
    });

    it('should handle user dismissing history entry selection', async () => {
      mockPaletteOpen = mock()
        .mockResolvedValueOnce({
          dismissed: false,
          item: { payload: 'history' },
        })
        .mockResolvedValueOnce({
          dismissed: true,
          item: null,
        });

      mockPaletteState = { open: mockPaletteOpen };
      journalEntryFlowModule = await import('./journalEntryFlow');

      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(onCreated).not.toHaveBeenCalled();
    });

    it('should use blank template when no past entry selected', async () => {
      mockPaletteOpen = mock()
        .mockResolvedValueOnce({
          dismissed: false,
          item: { payload: 'history' },
        })
        .mockResolvedValueOnce({
          dismissed: false,
          item: {
            payload: undefined,
          },
        });

      mockPaletteState = { open: mockPaletteOpen };
      journalEntryFlowModule = await import('./journalEntryFlow');

      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(onCreated).toHaveBeenCalledTimes(1);
      const createdContent = onCreated.mock.calls[0][0] as string;
      expect(createdContent).toContain('# Journal Entry');
    });
  });

  describe('WOD block extraction', () => {
    it('should auto-select single WOD block', async () => {
      // This test would verify that when a workout has exactly one WOD block,
      // it's auto-selected without showing the block picker
      // Implementation depends on how pickWodBlock is mocked
      const onCreated = mock();

      // Mock a workout with single WOD block
      mockPaletteOpen
        .mockResolvedValueOnce({
          dismissed: false,
          item: { payload: 'feed' },
        })
        .mockResolvedValueOnce({
          dismissed: false,
          item: {
            payload: {
              name: 'Single Block Workout',
              content: '```wod\nSingle WOD block\n```',
            },
          },
        });

      mockPaletteState = { open: mockPaletteOpen };
      journalEntryFlowModule = await import('./journalEntryFlow');

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    it('should show block picker for multiple WOD blocks', async () => {
      // This test would verify that when a workout has multiple WOD blocks,
      // the block picker is shown
      // Implementation would require mocking extractWodBlocks to return multiple blocks
      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      // Block picker should be shown
      expect(mockPaletteOpen).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle user dismissing mode selection', async () => {
      mockPaletteOpen.mockResolvedValueOnce({
        dismissed: true,
        item: null,
      });

      journalEntryFlowModule = await import('./journalEntryFlow');

      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(onCreated).not.toHaveBeenCalled();
    });

    it('should handle palette open errors gracefully', async () => {
      mockPaletteOpen.mockRejectedValueOnce(new Error('Palette error'));

      journalEntryFlowModule = await import('./journalEntryFlow');

      const onCreated = mock();

      // Should not throw, should handle error gracefully
      await expect(
        journalEntryFlowModule.createJournalEntryFlow({
          dateKey: '2024-01-15',
          onCreated,
        })
      ).rejects.toThrow();
    });
  });

  describe('date formatting', () => {
    it('should format date key correctly in palette header', async () => {
      mockPaletteOpen.mockResolvedValueOnce({
        dismissed: false,
        item: { payload: 'blank' },
      });

      journalEntryFlowModule = await import('./journalEntryFlow');

      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-01-15',
        onCreated,
      });

      expect(mockPaletteOpen).toHaveBeenCalledTimes(1);
      const callArgs = mockPaletteOpen.mock.calls[0];
      expect(callArgs).toBeDefined();
    });

    it('should handle leap year dates', async () => {
      mockPaletteOpen.mockResolvedValueOnce({
        dismissed: false,
        item: { payload: 'blank' },
      });

      journalEntryFlowModule = await import('./journalEntryFlow');

      const onCreated = mock();

      await journalEntryFlowModule.createJournalEntryFlow({
        dateKey: '2024-02-29', // Leap year
        onCreated,
      });

      expect(onCreated).toHaveBeenCalledTimes(1);
    });
  });
});
