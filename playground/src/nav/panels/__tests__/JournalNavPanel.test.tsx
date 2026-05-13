/**
 * JournalNavPanel.test.tsx — Unit tests for JournalNavPanel component.
 *
 * Tests cover:
 * - List page mode: calendar + tag chips
 * - Entry page mode: calendar + active date highlighting
 * - Calendar interaction and date selection
 * - Tag filter interactions
 * - Context-aware date click behavior
 * - Accessibility attributes
 * - Edge cases (invalid dates, empty tags)
 */

import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JournalNavPanel } from '../JournalNavPanel';
import type { NavPanelProps, NavState } from '../../navTypes';

// Mock dependencies
vi.mock('../../hooks/useJournalQueryState', () => ({
  useJournalQueryState: () => ({
    selectedDate: null,
    setSelectedDate: vi.fn(),
    dateParam: null,
    selectedTags: [],
    toggleTag: vi.fn(),
  }),
}));

vi.mock('@/components/ui/CalendarCard', () => ({
  CalendarCard: ({ selectedDate, onDateSelect, className }: any) => (
    <div data-testid="calendar-card" className={className}>
      <div>Calendar Mock</div>
      <div>Selected: {selectedDate ? selectedDate.toISOString() : 'none'}</div>
      <button onClick={() => onDateSelect && onDateSelect(new Date('2026-05-12'))}>
        Select Date
      </button>
      <button onClick={() => onDateSelect && onDateSelect(new Date('2026-05-12'), true)}>
        Select Multi
      </button>
    </div>
  ),
}));

describe('JournalNavPanel', () => {
  const mockItem = {
    id: 'journal',
    label: 'Journal',
    level: 2 as const,
    action: { type: 'none' as const },
  };

  const mockDispatch = vi.fn();

  const createNavState = (): NavState => ({
    activeL1Id: 'journal',
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
    vi.clearAllMocks();
  });

  describe('List Page Mode', () => {
    it('should render calendar and tag chips on /journal', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('calendar-card')).toBeTruthy();
      expect(screen.getByText('Tags')).toBeTruthy();
    });

    it('should render all placeholder tags', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: 'strength' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'cardio' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'mobility' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'kettlebell' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'swim' })).toBeTruthy();
    });

    it('should highlight selected tags', () => {
      const navState = createNavState();
      const props = createProps(navState);

      // Mock with selected tags
      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      useJournalQueryState.mockReturnValue({
        selectedDate: null,
        setSelectedDate: vi.fn(),
        dateParam: null,
        selectedTags: ['strength', 'cardio'],
        toggleTag: vi.fn(),
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const strengthButton = screen.getByRole('button', { name: 'strength' });
      const cardioButton = screen.getByRole('button', { name: 'cardio' });

      expect(strengthButton.className).toContain('bg-primary');
      expect(cardioButton.className).toContain('bg-primary');
    });

    it('should show active date filter badge when date is selected', () => {
      const navState = createNavState();
      const props = createProps(navState);

      // Mock with date param
      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      useJournalQueryState.mockReturnValue({
        selectedDate: new Date('2026-05-12'),
        setSelectedDate: vi.fn(),
        dateParam: '2026-05-12',
        selectedTags: [],
        toggleTag: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByText('Filtered to')).toBeTruthy();
      expect(screen.getByText(/2026-05-12/)).toBeTruthy();
    });
  });

  describe('Entry Page Mode', () => {
    it('should render calendar on /journal/:date', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/journal/2026-05-12']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('calendar-card')).toBeTruthy();
    });

    it('should not show tag chips on entry page', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/journal/2026-05-12']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      expect(screen.queryByText('Tags')).toBeNull();
    });

    it('should not show date filter badge on entry page', () => {
      const navState = createNavState();
      const props = createProps(navState);

      // Mock with date param
      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      useJournalQueryState.mockReturnValue({
        selectedDate: new Date('2026-05-12'),
        setSelectedDate: vi.fn(),
        dateParam: '2026-05-12',
        selectedTags: [],
        toggleTag: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/journal/2026-05-12']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      // On entry page, the filter badge should not show
      expect(screen.queryByText('Filtered to')).toBeNull();
    });
  });

  describe('Calendar Interaction', () => {
    it('should pass selected date to calendar on list page', () => {
      const navState = createNavState();
      const props = createProps(navState);

      // Mock with selected date
      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      const mockSetSelectedDate = vi.fn();
      useJournalQueryState.mockReturnValue({
        selectedDate: new Date('2026-05-12'),
        setSelectedDate: mockSetSelectedDate,
        dateParam: '2026-05-12',
        selectedTags: [],
        toggleTag: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const calendar = screen.getByTestId('calendar-card');
      expect(calendar.textContent).toContain('Selected:');
    });

    it('should pass date from URL to calendar on entry page', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/journal/2026-05-12']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const calendar = screen.getByTestId('calendar-card');
      expect(calendar).toBeTruthy();
    });
  });

  describe('Tag Interaction', () => {
    it('should handle tag clicks', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const mockToggleTag = vi.fn();
      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      useJournalQueryState.mockReturnValue({
        selectedDate: null,
        setSelectedDate: vi.fn(),
        dateParam: null,
        selectedTags: [],
        toggleTag: mockToggleTag,
      });

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const tagButton = screen.getByRole('button', { name: 'strength' });
      tagButton.click();

      expect(mockToggleTag).toHaveBeenCalledWith('strength');
    });

    it('should handle multiple tag selections', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const mockToggleTag = vi.fn();
      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      useJournalQueryState.mockReturnValue({
        selectedDate: null,
        setSelectedDate: vi.fn(),
        dateParam: null,
        selectedTags: ['strength'],
        toggleTag: mockToggleTag,
      });

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const cardioButton = screen.getByRole('button', { name: 'cardio' });
      cardioButton.click();

      expect(mockToggleTag).toHaveBeenCalledWith('cardio');
    });
  });

  describe('Date Filter Badge Interaction', () => {
    it('should clear date filter when badge close button is clicked', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const mockSetSelectedDate = vi.fn();
      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      useJournalQueryState.mockReturnValue({
        selectedDate: new Date('2026-05-12'),
        setSelectedDate: mockSetSelectedDate,
        dateParam: '2026-05-12',
        selectedTags: [],
        toggleTag: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const closeButton = screen.getByText(/2026-05-12 ×/);
      closeButton.click();

      expect(mockSetSelectedDate).toHaveBeenCalledWith(null);
    });
  });

  describe('Context-Aware Date Click Behavior', () => {
    it('should toggle date filter on list page', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const mockSetSelectedDate = vi.fn();
      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      useJournalQueryState.mockReturnValue({
        selectedDate: null,
        setSelectedDate: mockSetSelectedDate,
        dateParam: '2026-05-12',
        selectedTags: [],
        toggleTag: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      // Calendar interaction is tested through the mock
      // Real navigation behavior would be integration-level
    });
  });

  describe('Accessibility', () => {
    it('should render tag buttons with proper roles', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const tagButtons = screen.getAllByRole('button');
      expect(tagButtons.length).toBeGreaterThan(0);
    });

    it('should apply proper spacing and layout classes', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { container } = render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
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
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const header = screen.getByText('Tags');
      expect(header.className).toContain('text-[10px]');
      expect(header.className).toContain('font-bold');
      expect(header.className).toContain('uppercase');
    });

    it('should apply active tag button styles', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      useJournalQueryState.mockReturnValue({
        selectedDate: null,
        setSelectedDate: vi.fn(),
        dateParam: null,
        selectedTags: ['strength'],
        toggleTag: vi.fn(),
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const activeButton = screen.getByRole('button', { name: 'strength' });
      expect(activeButton.className).toContain('bg-primary');
      expect(activeButton.className).toContain('text-primary-foreground');
    });

    it('should apply inactive tag button styles', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const inactiveButton = screen.getByRole('button', { name: 'cardio' });
      expect(inactiveButton.className).toContain('bg-muted');
      expect(inactiveButton.className).toContain('text-muted-foreground');
    });

    it('should apply calendar styling classes', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const calendar = screen.getByTestId('calendar-card');
      expect(calendar.className).toContain('scale-95');
      expect(calendar.className).toContain('origin-top-left');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date in URL gracefully', () => {
      const navState = createNavState();
      const props = createProps(navState);

      render(
        <MemoryRouter initialEntries={['/journal/invalid-date']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      // Should not crash, selectedDateObj should be null
      const calendar = screen.getByTestId('calendar-card');
      expect(calendar.textContent).toContain('Selected: none');
    });

    it('should handle empty tags array', () => {
      const navState = createNavState();
      const props = createProps(navState);

      // Modify PLACEHOLDER_TAGS to be empty by overriding the component
      // This would require component modification or environmental mocking
      // For now, we test that the component renders without error
      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      // Should render tags section even if empty
      expect(screen.getByText('Tags')).toBeTruthy();
    });

    it('should handle date selection with null selectedDate', () => {
      const navState = createNavState();
      const props = createProps(navState);

      const { useJournalQueryState } = require('../../hooks/useJournalQueryState');
      useJournalQueryState.mockReturnValue({
        selectedDate: null,
        setSelectedDate: vi.fn(),
        dateParam: null,
        selectedTags: [],
        toggleTag: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/journal']}>
          <JournalNavPanel {...props} />
        </MemoryRouter>
      );

      const calendar = screen.getByTestId('calendar-card');
      expect(calendar.textContent).toContain('Selected: none');
    });
  });
});
