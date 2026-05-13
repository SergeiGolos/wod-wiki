/**
 * SearchNavPanel.test.tsx — Unit tests for SearchNavPanel component.
 *
 * Tests cover:
 * - Rendering search scope options (All, Collections, Notes, Results)
 * - Active scope highlighting with radio indicator
 * - User interactions (click events, scope changes)
 * - State management (dispatching SET_SEARCH_SCOPE actions)
 * - Accessibility attributes (button roles, ARIA states)
 * - Edge cases (different initial scopes)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { SearchNavPanel } from '../SearchNavPanel';
import type { NavPanelProps, NavState } from '../../navTypes';

describe('SearchNavPanel', () => {
  const mockItem = {
    id: 'search',
    label: 'Search',
    level: 2 as const,
    action: { type: 'none' as const },
  };

  const mockDispatch = vi.fn();

  const createNavState = (scope: NavState['searchFilter']['scope'] = 'all'): NavState => ({
    activeL1Id: 'search',
    activeL2Id: null,
    activeL3Id: null,
    leftDrawerOpen: false,
    rightDrawerOpen: false,
    expandedIds: new Set(),
    journalFilter: { selectedDate: null, selectedTags: [] },
    searchFilter: { scope },
  });

  const createProps = (navState: NavState): NavPanelProps => ({
    item: mockItem,
    navState,
    dispatch: mockDispatch,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render all four scope options', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      render(<SearchNavPanel {...props} />);

      expect(screen.getByRole('button', { name: 'All' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Collections' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Notes' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Results' })).toBeTruthy();
    });

    it('should render section header', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      render(<SearchNavPanel {...props} />);

      expect(screen.getByText('Search in')).toBeTruthy();
    });

    it('should render radio indicators for all options', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const radioIndicators = container.querySelectorAll('.border-current');
      expect(radioIndicators.length).toBe(4);
    });
  });

  describe('Active Scope Highlighting', () => {
    it('should highlight "All" when scope is "all"', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const allButton = screen.getByRole('button', { name: 'All' });
      expect(allButton.className).toContain('bg-primary/10');
      expect(allButton.className).toContain('text-primary');
    });

    it('should highlight "Collections" when scope is "collections"', () => {
      const navState = createNavState('collections');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const collectionsButton = screen.getByRole('button', { name: 'Collections' });
      expect(collectionsButton.className).toContain('bg-primary/10');
      expect(collectionsButton.className).toContain('text-primary');
    });

    it('should highlight "Notes" when scope is "notes"', () => {
      const navState = createNavState('notes');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const notesButton = screen.getByRole('button', { name: 'Notes' });
      expect(notesButton.className).toContain('bg-primary/10');
      expect(notesButton.className).toContain('text-primary');
    });

    it('should highlight "Results" when scope is "results"', () => {
      const navState = createNavState('results');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const resultsButton = screen.getByRole('button', { name: 'Results' });
      expect(resultsButton.className).toContain('bg-primary/10');
      expect(resultsButton.className).toContain('text-primary');
    });

    it('should show filled radio indicator for active scope', () => {
      const navState = createNavState('collections');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const radioIndicators = container.querySelectorAll('.bg-primary');
      expect(radioIndicators.length).toBe(1);
    });

    it('should apply inactive styles to non-active scopes', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const collectionsButton = screen.getByRole('button', { name: 'Collections' });
      expect(collectionsButton.className).toContain('text-muted-foreground');
      expect(collectionsButton.className).toContain('hover:bg-muted');
    });
  });

  describe('User Interactions', () => {
    it('should dispatch SET_SEARCH_SCOPE action when "All" is clicked', () => {
      const navState = createNavState('collections');
      const props = createProps(navState);

      render(<SearchNavPanel {...props} />);

      const allButton = screen.getByRole('button', { name: 'All' });
      allButton.click();

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_SEARCH_SCOPE', scope: 'all' });
    });

    it('should dispatch SET_SEARCH_SCOPE action when "Collections" is clicked', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      render(<SearchNavPanel {...props} />);

      const collectionsButton = screen.getByRole('button', { name: 'Collections' });
      collectionsButton.click();

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_SEARCH_SCOPE', scope: 'collections' });
    });

    it('should dispatch SET_SEARCH_SCOPE action when "Notes" is clicked', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      render(<SearchNavPanel {...props} />);

      const notesButton = screen.getByRole('button', { name: 'Notes' });
      notesButton.click();

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_SEARCH_SCOPE', scope: 'notes' });
    });

    it('should dispatch SET_SEARCH_SCOPE action when "Results" is clicked', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      render(<SearchNavPanel {...props} />);

      const resultsButton = screen.getByRole('button', { name: 'Results' });
      resultsButton.click();

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_SEARCH_SCOPE', scope: 'results' });
    });

    it('should handle rapid successive clicks', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      render(<SearchNavPanel {...props} />);

      const collectionsButton = screen.getByRole('button', { name: 'Collections' });
      const notesButton = screen.getByRole('button', { name: 'Notes' });

      collectionsButton.click();
      notesButton.click();

      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenNthCalledWith(1, { type: 'SET_SEARCH_SCOPE', scope: 'collections' });
      expect(mockDispatch).toHaveBeenNthCalledWith(2, { type: 'SET_SEARCH_SCOPE', scope: 'notes' });
    });
  });

  describe('Accessibility', () => {
    it('should render all options as buttons', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      render(<SearchNavPanel {...props} />);

      expect(screen.getByRole('button', { name: 'All' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Collections' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Notes' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Results' })).toBeTruthy();
    });

    it('should apply proper spacing and layout classes', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const wrapper = container.querySelector('.flex.flex-col');
      expect(wrapper).toBeTruthy();
    });

    it('should apply proper button spacing', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('gap-2.5');
      expect(button?.className).toContain('rounded-lg');
      expect(button?.className).toContain('px-3');
      expect(button?.className).toContain('py-2');
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply header styling', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      render(<SearchNavPanel {...props} />);

      const header = screen.getByText('Search in');
      expect(header.className).toContain('text-[10px]');
      expect(header.className).toContain('font-bold');
      expect(header.className).toContain('uppercase');
      expect(header.className).toContain('tracking-widest');
      expect(header.className).toContain('text-muted-foreground/60');
    });

    it('should apply radio indicator styling', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const radioContainer = container.querySelector('[class*="size-3.5"]');
      expect(radioContainer).toBeTruthy();
      expect(radioContainer?.className).toContain('flex');
      expect(radioContainer?.className).toContain('items-center');
      expect(radioContainer?.className).toContain('justify-center');
      expect(radioContainer?.className).toContain('rounded-full');
    });

    it('should apply hover states to inactive buttons', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const inactiveButton = screen.getByRole('button', { name: 'Collections' });
      expect(inactiveButton.className).toContain('hover:bg-muted');
      expect(inactiveButton.className).toContain('hover:text-foreground');
    });
  });

  describe('Edge Cases', () => {
    it('should handle switching from one scope to another', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      const { rerender } = render(<SearchNavPanel {...props} />);

      // Initial state: all is active
      expect(screen.getByRole('button', { name: 'All' }).className).toContain('bg-primary/10');

      // Update state to collections
      const updatedNavState = createNavState('collections');
      const updatedProps = createProps(updatedNavState);
      rerender(<SearchNavPanel {...updatedProps} />);

      // Now collections should be active
      expect(screen.getByRole('button', { name: 'Collections' }).className).toContain('bg-primary/10');
    });

    it('should render consistently with different initial scopes', () => {
      const scopes: Array<NavState['searchFilter']['scope']> = ['all', 'collections', 'notes', 'results'];

      scopes.forEach((scope) => {
        const navState = createNavState(scope);
        const props = createProps(navState);

        const { container } = render(<SearchNavPanel {...props} />);

        // Should always have 4 buttons
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBe(4);

        // Cleanup
        container.remove();
      });
    });

    it('should maintain button order', () => {
      const navState = createNavState('all');
      const props = createProps(navState);

      const { container } = render(<SearchNavPanel {...props} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons[0].textContent).toBe('All');
      expect(buttons[1].textContent).toBe('Collections');
      expect(buttons[2].textContent).toBe('Notes');
      expect(buttons[3].textContent).toBe('Results');
    });
  });
});
