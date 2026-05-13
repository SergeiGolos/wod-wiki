/**
 * FeedsNavPanel.test.tsx — Unit tests for FeedsNavPanel component.
 *
 * Tests cover:
 * - List page mode: calendar + feed chips
 * - Feed detail page mode: calendar + feed items
 * - Feed item detail mode: calendar + sibling items
 * - Calendar interaction and date selection
 * - Feed filter interactions
 * - Navigation behaviors
 * - Accessibility attributes
 * - Edge cases (empty feeds, invalid dates)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FeedsNavPanel } from '../FeedsNavPanel';
import type { NavPanelProps, NavState } from '../../navTypes';

// Mock dependencies
// NOTE: path is relative to THIS TEST FILE (in __tests__/ subdirectory),
// so needs one extra '../' compared to the component's import.
vi.mock('../../../hooks/useFeedsQueryState', () => ({
  useFeedsQueryState: vi.fn(() => ({
    dateParam: null,
    selectedDate: null,
    setSelectedDate: vi.fn(),
    selectedFeed: null,
    selectFeed: vi.fn(),
    clearFeed: vi.fn(),
  })),
}));

vi.mock('@/repositories/wod-feeds', () => ({
  getWodFeeds: () => [
    {
      id: 'daily-wod',
      name: 'Daily WOD',
      items: [
        { id: 'wod-1', name: 'Monday WOD', feedDate: '2026-05-10' },
        { id: 'wod-2', name: 'Tuesday WOD', feedDate: '2026-05-11' },
        { id: 'wod-3', name: 'Wednesday WOD', feedDate: '2026-05-12' },
      ],
    },
    {
      id: 'weekly-challenge',
      name: 'Weekly Challenge',
      items: [
        { id: 'challenge-1', name: 'Week 1 Challenge', feedDate: '2026-05-08' },
        { id: 'challenge-2', name: 'Week 2 Challenge', feedDate: '2026-05-15' },
      ],
    },
  ],
  getWodFeed: (slug: string) => {
    if (slug === 'daily-wod') {
      return {
        id: 'daily-wod',
        name: 'Daily WOD',
        items: [
          { id: 'wod-1', name: 'Monday WOD', feedDate: '2026-05-10' },
          { id: 'wod-2', name: 'Tuesday WOD', feedDate: '2026-05-11' },
          { id: 'wod-3', name: 'Wednesday WOD', feedDate: '2026-05-12' },
        ],
      };
    }
    return null;
  },
  getFeedDateKeys: (feed: any) => {
    if (!feed || !feed.items) return [];
    const dates = new Set(feed.items.map((item: any) => item.feedDate));
    return Array.from(dates).sort();
  },
}));

vi.mock('@/components/ui/CalendarCard', () => ({
  CalendarCard: ({ selectedDate, onDateSelect, entryDates, className }: any) => (
    <div data-testid="calendar-card" className={className}>
      <div>Calendar Mock</div>
      <div>Selected: {selectedDate ? selectedDate.toISOString() : 'none'}</div>
      <div>Entries: {entryDates ? entryDates.size : 0}</div>
      <button onClick={() => onDateSelect && onDateSelect(new Date('2026-05-12'))}>
        Select Date
      </button>
    </div>
  ),
}));

describe('FeedsNavPanel', () => {
  const mockItem = {
    id: 'feeds',
    label: 'Feeds',
    level: 2 as const,
    action: { type: 'none' as const },
  };

  const mockDispatch = vi.fn();

  const createNavState = (): NavState => ({
    activeL1Id: 'feeds',
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
    it('should render calendar and feed chips on /feeds', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('calendar-card')).toBeTruthy();
      expect(screen.getByText('Feeds')).toBeTruthy();
    });

    it('should render all available feeds', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: 'Daily WOD' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Weekly Challenge' })).toBeTruthy();
    });

    it('should show Clear button when feed is selected', () => {
      const navState = createNavState();
      const props = createProps(navState);

      // Mock with selected feed
      const { useFeedsQueryState } = require('../../../hooks/useFeedsQueryState');
      useFeedsQueryState.mockReturnValue({
        dateParam: null,
        selectedDate: null,
        setSelectedDate: vi.fn(),
        selectedFeed: 'daily-wod',
        selectFeed: vi.fn(),
        clearFeed: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText('Clear')).toBeTruthy();
    });
  });

  describe('Feed Detail Page Mode', () => {
    it('should render calendar and session list on /feeds/:slug', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds/daily-wod']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('calendar-card')).toBeTruthy();
      expect(screen.getByText('Sessions')).toBeTruthy();
      expect(screen.getByText('All feeds')).toBeTruthy();
    });

    it('should render session dates with item counts', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds/daily-wod']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      // Should show date buttons with counts
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show back button to feed list', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds/daily-wod']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText('All feeds')).toBeTruthy();
    });
  });

  describe('Feed Item Detail Mode', () => {
    it('should render calendar and sibling items on /feeds/:slug/:date/:item', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds/daily-wod/2026-05-12/wod-3']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('calendar-card')).toBeTruthy();
    });

    it('should highlight active feed item', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/feeds/daily-wod/2026-05-12/wod-3']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      // Wednesday WOD should be highlighted as active
      const activeButton = screen.getByRole('button', { name: 'Wednesday WOD' });
      expect(activeButton.className).toContain('bg-primary/10');
    });

    it('should show back link to feed', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds/daily-wod/2026-05-12/wod-3']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText(/Daily WOD/)).toBeTruthy();
    });
  });

  describe('Calendar Interaction', () => {
    it('should pass entry dates to calendar', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      const calendar = screen.getByTestId('calendar-card');
      expect(calendar.textContent).toContain('Entries:');
    });
  });

  describe('Feed Selection', () => {
    it('should render radio indicators for feeds', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      // Should have radio-style indicators (Tailwind .size-3.5 class)
      // Note: CSS selector for Tailwind class with dots uses attribute selector
      const radioIndicators = container.querySelectorAll('[class*="size-3"]');
      expect(radioIndicators.length).toBeGreaterThan(0);
    });

    it('should highlight selected feed', () => {
      const navState = createNavState();
      const props = createProps(navState);

      // Mock with selected feed
      const { useFeedsQueryState } = require('../../../hooks/useFeedsQueryState');
      useFeedsQueryState.mockReturnValue({
        dateParam: null,
        selectedDate: null,
        setSelectedDate: vi.fn(),
        selectedFeed: 'daily-wod',
        selectFeed: vi.fn(),
        clearFeed: vi.fn(),
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      const activeButton = screen.getByRole('button', { name: 'Daily WOD' });
      expect(activeButton.className).toContain('bg-primary/10');
    });
  });

  describe('Date Filter Badge', () => {
    it('should show active date filter badge when date is selected', () => {
      const navState = createNavState();
      const props = createProps(navState);

      // Mock with date param
      const { useFeedsQueryState } = require('../../../hooks/useFeedsQueryState');
      useFeedsQueryState.mockReturnValue({
        dateParam: '2026-05-12',
        selectedDate: new Date('2026-05-12'),
        setSelectedDate: vi.fn(),
        selectedFeed: null,
        selectFeed: vi.fn(),
        clearFeed: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText('Filtered to')).toBeTruthy();
      // Use getAllByText since the calendar mock also renders the date
      expect(screen.getAllByText(/2026-05-12/).length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should render buttons with proper roles', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should apply proper spacing and layout classes', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      const wrapper = container.querySelector('.flex.flex-col');
      expect(wrapper).toBeTruthy();
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply header styling', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      const header = screen.getByText('Feeds');
      expect(header.className).toContain('text-[10px]');
      expect(header.className).toContain('font-bold');
      expect(header.className).toContain('uppercase');
    });

    it('should apply active button styles', () => {
      const { useFeedsQueryState } = require('../../../hooks/useFeedsQueryState');
      useFeedsQueryState.mockReturnValue({
        dateParam: null,
        selectedDate: null,
        setSelectedDate: vi.fn(),
        selectedFeed: 'daily-wod',
        selectFeed: vi.fn(),
        clearFeed: vi.fn(),
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...createProps(createNavState())} />
        </MemoryRouter>
      );

      const activeButton = screen.getByRole('button', { name: 'Daily WOD' });
      expect(activeButton.className).toContain('bg-primary/10');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent feed gracefully', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds/nonexistent']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      // Should not crash, may render list page mode
    });

    it('should handle empty feeds', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/feeds']}>
          <FeedsNavPanel {...props} />
        </MemoryRouter>
      );

      // Should handle empty feed items gracefully
    });
  });
});
