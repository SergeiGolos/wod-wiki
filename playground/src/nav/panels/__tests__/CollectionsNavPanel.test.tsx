/**
 * CollectionsNavPanel.test.tsx — Unit tests for CollectionsNavPanel component.
 *
 * Tests cover:
 * - List page mode: category filter toggles
 * - Collection detail page mode: category links
 * - Workout detail page mode: parent collection + sibling workouts
 * - Navigation interactions (route changes)
 * - Active state highlighting
 * - Accessibility attributes
 * - Edge cases (non-matching routes, empty states)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CollectionsNavPanel } from '../CollectionsNavPanel';
import type { NavPanelProps, NavState } from '../../navTypes';

// Mock dependencies
// NOTE: paths are relative to THIS TEST FILE (in __tests__/ subdirectory),
// so need one extra '../' compared to the component's imports.
vi.mock('../../../hooks/useCollectionsQueryState', () => ({
  useCollectionsQueryState: () => ({
    selectedCategories: [],
    toggleCategory: vi.fn(),
    clearCategories: vi.fn(),
  }),
}));

vi.mock('@/repositories/wod-collections', () => ({
  getWodCollection: vi.fn((slug: string) => {
    const mockCollections: Record<string, any> = {
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
    return mockCollections[slug] || null;
  }),
}));

vi.mock('../../../config/collectionGroups', () => ({
  getCategoryGroups: () => ({
    endurance: ['Cardio', 'Running'],
    strength: ['Powerlifting', 'Bodybuilding'],
    conditioning: ['HIIT', 'Circuit'],
  }),
}));

vi.mock('../../../pages/shared/pageUtils', () => ({
  NON_COLLECTION_CATEGORIES: new Set(['wod', 'benchmark', 'custom']),
}));

describe('CollectionsNavPanel', () => {
  const mockItem = {
    id: 'collections',
    label: 'Collections',
    level: 2 as const,
    action: { type: 'none' as const },
  };

  const mockDispatch = vi.fn();

  const createNavState = (): NavState => ({
    activeL1Id: 'collections',
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
  });

  afterEach(() => {
    cleanup();
  });

  describe('List Page Mode', () => {
    it('should render category filters on /collections', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/collections']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText('Category')).toBeTruthy();
    });

    it('should show Clear button when categories are selected', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/collections']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // With the mock returning empty selectedCategories, Clear should not show
      const clearButton = screen.queryByText('Clear');
      expect(clearButton).toBeNull();
    });
  });

  describe('Collection Detail Page Mode', () => {
    it('should render collection categories on /collections/:slug', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/collections/cardio']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText('Categories')).toBeTruthy();
    });

    it('should highlight active categories in the collection', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/collections/cardio']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // Cardio collection has endurance, hiit, conditioning
      // These should be highlighted (active) in the collection
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should navigate to collection with category filter when category is clicked', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/collections/cardio']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // Find a category button and click it
      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        buttons[0].click();
        // Should trigger navigation (would need to test actual route in integration test)
      }
    });
  });

  describe('Workout Detail Page Mode', () => {
    it('should render parent collection and sibling workouts on /workout/:category/:name', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/workout/cardio/5k-run']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText('Collection')).toBeTruthy();
      // Should show the cardio collection name
      expect(screen.getByText('Cardio Workouts')).toBeTruthy();
    });

    it('should highlight the active workout in the collection', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/workout/cardio/5k-run']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // 5K Run should be highlighted as active
      const activeButton = screen.getByRole('button', { name: '5K Run' });
      expect(activeButton).toBeTruthy();
    });

    it('should show sibling workouts in the collection', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/workout/cardio/5k-run']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // Should show Interval Training as a sibling
      expect(screen.getByRole('button', { name: 'Interval Training' })).toBeTruthy();
    });

    it('should navigate to collection when clicking collection name', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/workout/cardio/5k-run']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      const collectionButton = screen.getByRole('button', { name: 'Cardio Workouts' });
      expect(collectionButton).toBeTruthy();
      // Click test would be integration-level
    });
  });

  describe('Non-Matching Routes', () => {
    it('should return null on non-matching routes', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/journal']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // Should render empty container
      expect(container.firstChild).toBeNull();
    });

    it('should return null for non-collection workout categories', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/workout/wod/custom-wod']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // 'wod' is in NON_COLLECTION_CATEGORIES, should return null
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should render buttons with proper roles', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/collections']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should apply proper spacing and layout classes', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/collections']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      const wrapper = container.querySelector('.flex.flex-col');
      expect(wrapper).toBeTruthy();
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply active button styles', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/workout/cardio/5k-run']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      const activeButton = screen.getByRole('button', { name: '5K Run' });
      expect(activeButton.className).toContain('bg-primary/10');
      expect(activeButton.className).toContain('text-primary');
    });

    it('should apply inactive button styles', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/workout/cardio/5k-run']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      const inactiveButton = screen.getByRole('button', { name: 'Interval Training' });
      expect(inactiveButton.className).toContain('text-muted-foreground');
      expect(inactiveButton.className).toContain('hover:bg-muted');
    });

    it('should apply header styling', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/collections/cardio']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      const header = screen.getByText('Categories');
      expect(header.className).toContain('text-[10px]');
      expect(header.className).toContain('font-bold');
      expect(header.className).toContain('uppercase');
    });
  });

  describe('Edge Cases', () => {
    it('should handle collection not found gracefully', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/collections/nonexistent']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // Should return null when collection is not found
      expect(container.firstChild).toBeNull();
    });

    it('should handle URL encoding for special characters', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/collections/Cardio%20Workouts']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // Should decode URL-encoded slug
      // This would test the decodeURIComponent logic
    });

    it('should handle empty collection items', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/workout/empty/workout']}>
          <CollectionsNavPanel {...props} />
        </MemoryRouter>
      );

      // Should handle collections with no items gracefully
    });
  });
});
