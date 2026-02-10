/**
 * History Types
 *
 * Type definitions for the history panel expansion:
 * - HistoryEntry: A stored workout post
 * - HistoryFilters: Filter criteria for browsing
 * - HistorySelectionState: Full selection state
 * - SelectionMode: Derived from selection count
 * - StripMode: Controls which views appear in the strip
 */

/**
 * A stored workout entry in the history.
 */
export interface HistoryEntry {
  id: string;
  name: string;
  date: Date;
  duration: number;       // seconds
  tags: string[];
  workoutType: string;
  results?: Record<string, unknown>;
  rawContent: string;     // original markdown
}

/**
 * Filter criteria for browsing history entries.
 */
export interface HistoryFilters {
  workoutType: string | null;
  tags: string[];
  durationRange: [number, number] | null;  // [min, max] in seconds
  dateRange: [Date, Date] | null;
}

/**
 * Selection mode derived from the number of selected entries.
 */
export type SelectionMode = 'none' | 'single' | 'multi';

/**
 * Strip mode controls which views appear in the sliding strip.
 * - 'history-only': Only History view (nothing selected)
 * - 'single-select': History + Plan + Track + Review (one entry selected)
 * - 'multi-select': History + Analyze (multiple entries selected)
 * - 'static': Plan + Track + Review (static content provider, no history)
 */
export type StripMode = 'history-only' | 'single-select' | 'multi-select' | 'static';

/**
 * Full history selection state managed by useHistorySelection hook.
 */
export interface HistorySelectionState {
  entries: HistoryEntry[];
  selectedIds: Set<string>;
  selectionMode: SelectionMode;
  activeEntryId: string | null;
  calendarDate: Date;
  filters: HistoryFilters;
}
