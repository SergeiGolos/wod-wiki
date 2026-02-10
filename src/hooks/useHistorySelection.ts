/**
 * useHistorySelection - Selection state management hook
 *
 * Only mounted when contentMode='history'. Manages:
 * - Selected entry IDs and derived selection mode
 * - Strip mode (derived from selection count)
 * - Calendar date navigation
 * - Filter state
 *
 * Actions: toggleEntry, selectAll, clearSelection, setCalendarDate, setFilters
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
  calendarDate: Date;
  filters: HistoryFilters;
  toggleEntry: (id: string) => void;
  selectAll: (visibleIds: string[]) => void;
  clearSelection: () => void;
  setCalendarDate: (date: Date) => void;
  setFilters: (partial: Partial<HistoryFilters>) => void;
}

export function useHistorySelection(): UseHistorySelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [filters, setFiltersState] = useState<HistoryFilters>(defaultFilters);

  const selectionMode = useMemo<SelectionMode>(() => {
    if (selectedIds.size === 0) return 'none';
    if (selectedIds.size === 1) return 'single';
    return 'multi';
  }, [selectedIds.size]);

  const stripMode = useMemo<StripMode>(() => {
    switch (selectionMode) {
      case 'none': return 'history-only';
      case 'single': return 'single-select';
      case 'multi': return 'multi-select';
    }
  }, [selectionMode]);

  const toggleEntry = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((visibleIds: string[]) => {
    setSelectedIds(new Set(visibleIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const setFilters = useCallback((partial: Partial<HistoryFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  return {
    selectedIds,
    selectionMode,
    stripMode,
    calendarDate,
    filters,
    toggleEntry,
    selectAll,
    clearSelection,
    setCalendarDate,
    setFilters,
  };
}
