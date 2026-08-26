/**
 * Tests for useHistorySelection hook
 *
 * Verifies:
 * - Toggle adds/removes entries
 * - Selection mode transitions (none → single → multi)
 * - Strip mode derived from selection count
 * - selectAll / clearSelection
 * - Calendar date and filter management
 */

import { describe, it, expect } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useHistorySelection } from '../useHistorySelection';

describe('useHistorySelection', () => {
  it('should start with empty selection', () => {
    const { result } = renderHook(() => useHistorySelection());

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.selectionMode).toBe('none');
    expect(result.current.stripMode).toBe('history-only');
  });

  it('should toggle an entry to selected (checkbox, stays history-only)', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.toggleEntry('entry-1');
    });

    expect(result.current.selectedIds.has('entry-1')).toBe(true);
    expect(result.current.selectedIds.size).toBe(1);
    expect(result.current.selectionMode).toBe('single');
    // 1 checkbox does NOT trigger single-select strip mode — that requires openEntry
    expect(result.current.stripMode).toBe('history-only');
  });

  it('should toggle an entry off', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.toggleEntry('entry-1');
    });
    act(() => {
      result.current.toggleEntry('entry-1');
    });

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.selectionMode).toBe('none');
    expect(result.current.stripMode).toBe('history-only');
  });

  it('should transition to multi-select with 2+ entries', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.toggleEntry('entry-1');
    });
    act(() => {
      result.current.toggleEntry('entry-2');
    });

    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.selectionMode).toBe('multi');
    expect(result.current.stripMode).toBe('multi-select');
  });

  it('should transition from multi back to history-only when deselecting to 1', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.toggleEntry('entry-1');
    });
    act(() => {
      result.current.toggleEntry('entry-2');
    });
    expect(result.current.selectionMode).toBe('multi');

    act(() => {
      result.current.toggleEntry('entry-2');
    });

    expect(result.current.selectedIds.size).toBe(1);
    expect(result.current.selectionMode).toBe('single');
    // 1 checkbox → still history-only (not single-select)
    expect(result.current.stripMode).toBe('history-only');
  });

  it('should selectAll with given IDs', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.selectAll(['a', 'b', 'c']);
    });

    expect(result.current.selectedIds.size).toBe(3);
    expect(result.current.selectedIds.has('a')).toBe(true);
    expect(result.current.selectedIds.has('b')).toBe(true);
    expect(result.current.selectedIds.has('c')).toBe(true);
    expect(result.current.selectionMode).toBe('multi');
    expect(result.current.stripMode).toBe('multi-select');
  });

  it('should clearSelection', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.selectAll(['a', 'b', 'c']);
    });
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.selectionMode).toBe('none');
    expect(result.current.stripMode).toBe('history-only');
  });

  it('should update calendar date', () => {
    const { result } = renderHook(() => useHistorySelection());
    const newDate = new Date('2025-06-15');

    act(() => {
      result.current.setCalendarDate(newDate);
    });

    expect(result.current.calendarDate).toEqual(newDate);
  });

  it('should update filters partially', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.setFilters({ workoutType: 'AMRAP' });
    });

    expect(result.current.filters.workoutType).toBe('AMRAP');
    expect(result.current.filters.tags).toEqual([]); // other fields unchanged
  });

  it('should merge filter updates', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.setFilters({ workoutType: 'AMRAP' });
    });
    act(() => {
      result.current.setFilters({ tags: ['strength'] });
    });

    expect(result.current.filters.workoutType).toBe('AMRAP');
    expect(result.current.filters.tags).toEqual(['strength']);
  });

  it('should set activeEntryId and single-select strip mode on openEntry', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.openEntry('entry-1');
    });

    expect(result.current.activeEntryId).toBe('entry-1');
    expect(result.current.stripMode).toBe('single-select');
  });

  it('should clear activeEntryId on closeEntry', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.openEntry('entry-1');
    });
    act(() => {
      result.current.closeEntry();
    });

    expect(result.current.activeEntryId).toBeNull();
    expect(result.current.stripMode).toBe('history-only');
  });

  it('should clear activeEntryId on clearSelection', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.openEntry('entry-1');
    });
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.activeEntryId).toBeNull();
    expect(result.current.stripMode).toBe('history-only');
  });

  it('should prioritize multi-select over active entry', () => {
    const { result } = renderHook(() => useHistorySelection());

    act(() => {
      result.current.openEntry('entry-1');
    });
    expect(result.current.stripMode).toBe('single-select');

    act(() => {
      result.current.toggleEntry('entry-2');
    });
    act(() => {
      result.current.toggleEntry('entry-3');
    });

    // 2+ checked overrides activeEntry
    expect(result.current.stripMode).toBe('multi-select');
  });
});
