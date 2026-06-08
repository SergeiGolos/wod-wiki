/**
 * EffortsNavPanel.test.tsx — Unit tests for EffortsNavPanel component.
 *
 * Tests cover:
 * - List page mode: origin + discipline filter toggles
 * - Detail page mode: recent workouts list
 * - Navigation interactions (route changes)
 * - Active state highlighting
 * - Edge cases (non-matching routes, empty states, loading)
 */

import { mock, vi, describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { NavPanelProps, NavState } from '../../navTypes';

// IndexedDBService instantiates an IndexedDB connection at module load time.
// Provide a minimal global mock so the module can load in Node/Bun test env.
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

// Mock IndexedDBService methods used by the component
const mockGetRecentResults = vi.fn();
mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getRecentResults: mockGetRecentResults,
  },
}));
// Mock hooks and context before importing the component
mock.module('../../../hooks/useEffortsQueryState', () => ({
  useEffortsQueryState: () => ({
    origin: 'all',
    setOrigin: vi.fn(),
    discipline: '',
    setDiscipline: vi.fn(),
  }),
}));

mock.module('../../../contexts/EffortRegistryContext', () => ({
  useEffortRegistry: () => ({
    registry: {
      resolve: vi.fn((slug: string) => {
        if (slug === 'push-up') {
          return {
            id: 'effort-1',
            slug: 'push-up',
            label: 'Push-up',
            aliases: ['pushup', 'press-up'],
            baseAttributes: { met: 5.0, discipline: 'strength', intensityTier: 'moderate' },
            registrySource: 'bundled',
          };
        }
        if (slug === 'run') {
          return {
            id: 'effort-2',
            slug: 'run',
            label: 'Run',
            aliases: ['running', 'jog'],
            baseAttributes: { met: 9.8, discipline: 'cardio', intensityTier: 'high' },
            registrySource: 'bundled',
          };
        }
        return null;
      }),
      list: vi.fn(() => [
        { slug: 'push-up', label: 'Push-up', baseAttributes: { met: 5.0, discipline: 'strength' }, registrySource: 'bundled' },
        { slug: 'run', label: 'Run', baseAttributes: { met: 9.8, discipline: 'cardio' }, registrySource: 'bundled' },
        { slug: 'custom-squat', label: 'Custom Squat', baseAttributes: { met: 6.0 }, registrySource: 'user' },
      ]),
    },
    isReady: true,
    error: null,
    refresh: vi.fn(),
  }),
}));

// Dynamic import of the component under test so mocks are registered first
const { EffortsNavPanel } = await import('../EffortsNavPanel');

describe('EffortsNavPanel', () => {
  const mockItem = {
    id: 'efforts',
    label: 'Efforts',
    level: 2 as const,
    action: { type: 'none' as const },
  };

  const mockDispatch = vi.fn();

  const createNavState = (): NavState => ({
    activeL1Id: 'efforts',
    activeL2Id: null,
    activeL3Id: null,
    leftDrawerOpen: false,
    rightDrawerOpen: false,
    expandedIds: new Set(),
    journalFilter: { selectedDate: null, selectedTags: [] },
    searchFilter: { scope: 'all' },
  });

  const createProps = (navState: NavState): NavPanelProps => ({
    item: mockItem,
    navState,
    dispatch: mockDispatch,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetRecentResults.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  describe('List Page Mode', () => {
    it('should render origin filters on /efforts', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/efforts']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText('Origin')).toBeTruthy();
      const allButtons = screen.getAllByRole('button', { name: 'All' });
      expect(allButtons.length).toBe(2); // One in Origin, one in Discipline
      expect(screen.getByRole('button', { name: 'Bundled' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Custom' })).toBeTruthy();
    });

    it('should render discipline filters on /efforts', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/efforts']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText('Discipline')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'strength' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'cardio' })).toBeTruthy();
    });

    it('should highlight active origin filter', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/efforts']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      // Default origin is 'all', so the "All" button under Origin should be active
      const originAllButton = screen.getAllByRole('button', { name: 'All' })[0];
      expect(originAllButton.className).toContain('bg-primary/10');
    });
  });

  describe('Detail Page Mode', () => {
    it('should render recent workouts header on /effort/:slug', async () => {
      const navState = createNavState();
      const props = createProps(navState);

      mockGetRecentResults.mockResolvedValue([
        {
          id: 'result-1',
          noteId: 'journal/2024-01-15',
          completedAt: new Date('2024-01-15T10:30:00').getTime(),
          data: {
            logs: [
              {
                id: 1,
                outputType: 'segment',
                timeSpan: { started: 0 },
                spans: [],
                elapsed: 30000,
                total: 35000,
                metrics: [
                  { type: 'effort', value: 'Push-up', image: 'Push-up', origin: 'parser' },
                ],
                sourceBlockKey: 'block-1',
                stackLevel: 0,
              },
            ],
          },
        },
      ]);

      render(
        <MemoryRouter initialEntries={['/effort/push-up']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Recent Workouts')).toBeTruthy();
      });
    });

    it('should show "All efforts" back link on detail page', async () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/effort/push-up']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'All efforts' })).toBeTruthy();
      });
    });

    it('should show empty state when no recent workouts', async () => {
      const navState = createNavState();
      const props = createProps(navState);

      mockGetRecentResults.mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/effort/push-up']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No recent workouts found for this effort.')).toBeTruthy();
      });
    });

    it('should show loading state while fetching results', () => {
      const navState = createNavState();
      const props = createProps(navState);

      // Never resolves so loading stays true
      mockGetRecentResults.mockImplementation(() => new Promise(() => {}));

      render(
        <MemoryRouter initialEntries={['/effort/push-up']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      const pulse = document.querySelector('.animate-pulse');
      expect(pulse).toBeTruthy();
    });

    it('should render workout result items with date and time', async () => {
      const navState = createNavState();
      const props = createProps(navState);

      mockGetRecentResults.mockResolvedValue([
        {
          id: 'result-1',
          noteId: 'journal/2024-01-15',
          completedAt: new Date('2024-01-15T10:30:00').getTime(),
          data: {
            startTime: new Date('2024-01-15T10:00:00').getTime(),
            endTime: new Date('2024-01-15T10:30:00').getTime(),
            duration: 1800000,
            completed: true,
            logs: [
              {
                id: 1,
                outputType: 'segment',
                timeSpan: { started: 0 },
                spans: [],
                elapsed: 30000,
                total: 35000,
                metrics: [
                  { type: 'effort', value: 'Push-up', image: 'Push-up', origin: 'parser' },
                ],
                sourceBlockKey: 'block-1',
                stackLevel: 0,
              },
            ],
          },
        },
      ]);

      render(
        <MemoryRouter initialEntries={['/effort/push-up']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Jan 15, 2024')).toBeTruthy();
      });
    });
  });

  describe('Non-Matching Routes', () => {
    it('should return null on non-effort routes', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/journal']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
    });

    it('should return null for /effort/new', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/effort/new']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should render buttons with proper roles on list page', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/efforts']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should apply proper layout classes', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/efforts']}>
          <EffortsNavPanel {...props} />
        </MemoryRouter>
      );

      const wrapper = container.querySelector('.flex.flex-col');
      expect(wrapper).toBeTruthy();
    });
  });
});
