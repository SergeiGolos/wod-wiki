/**
 * useHistorySelection - Selection state management hook
 *
 * Only mounted when contentMode='history'. Manages:
 * - Active entry (row click = view a workout in Plan)
 * - Checked entry IDs (checkbox = batch select for Analyze)
 * - Strip mode derived from active entry / checked count
 * - Calendar date navigation
 * - Filter state
 *
 * Actions: openEntry, toggleEntry, selectAll, clearSelection, setCalendarDate, setFilters
 */

import { useState, useMemo, useCallback } from 'react';
import type { HistoryFilters, SelectionMode, StripMode } from '../types/history';

const defaultFilters: HistoryFilters = {
  workoutType: null,
  tags: [],
  durationRange: null,
  dateRange: null,
};

export interface UseHistorySelectionReturn {
  selectedIds: Set<string>;
  selectionMode: SelectionMode;
  stripMode: StripMode;
  activeEntryId: string | null;
  calendarDate: Date;
  filters: HistoryFilters;
  openEntry: (id: string) => void;
  closeEntry: () => void;
  toggleEntry: (id: string) => void;
  selectAll: (visibleIds: string[]) => void;
  clearSelection: () => void;
  setCalendarDate: (date: Date) => void;
  setFilters: (partial: Partial<HistoryFilters>) => void;
}

export function useHistorySelection(initialActiveEntryId: string | null = null): UseHistorySelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeEntryId, setActiveEntryId] = useState<string | null>(initialActiveEntryId ?? null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [filters, setFiltersState] = useState<HistoryFilters>(defaultFilters);

  const selectionMode = useMemo<SelectionMode>(() => {
    if (selectedIds.size === 0) return 'none';
    if (selectedIds.size === 1) return 'single';
    return 'multi';
  }, [selectedIds.size]);

  // Strip mode derivation:
  // - 2+ checked entries → multi-select (Analyze view)
  // - active entry open → single-select (Plan/Track/Review available)
  // - otherwise → history-only (just browsing)
  const stripMode = useMemo<StripMode>(() => {
    if (selectedIds.size >= 2) return 'multi-select';
    if (activeEntryId !== null) return 'single-select';
    return 'history-only';
  }, [selectedIds.size, activeEntryId]);

  // Open an entry for viewing (row click → load + slide to Plan)
  const openEntry = useCallback((id: string) => {
    setActiveEntryId(id);
  }, []);

  // Close the active entry (go back to history-only)
  const closeEntry = useCallback(() => {
    setActiveEntryId(null);
  }, []);

  const toggleEntry = useCallback((id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      // If unchecking the currently active entry, try to fallback to another selected entry
      if (activeEntryId === id) {
        if (next.size === 0) setActiveEntryId(null);
        else setActiveEntryId(Array.from(next)[0]);
      }
    } else {
      next.add(id);
      // If this is the first selection or no active entry, make it active
      if (next.size === 1 || activeEntryId === null) {
        setActiveEntryId(id);
      }
    }
    setSelectedIds(next);
  }, [selectedIds, activeEntryId]);

  const selectAll = useCallback((visibleIds: string[]) => {
    setSelectedIds(new Set(visibleIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setActiveEntryId(null);
  }, []);

  const setFilters = useCallback((partial: Partial<HistoryFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  return {
    selectedIds,
    selectionMode,
    stripMode,
    activeEntryId,
    calendarDate,
    filters,
    openEntry,
    closeEntry,
    toggleEntry,
    selectAll,
    clearSelection,
    setCalendarDate,
    setFilters,
  };
}
