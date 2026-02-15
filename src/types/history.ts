/**
 * History Types
 *
 * Type definitions for the history panel expansion:
 * - HistoryEntry: A stored workout post
 * - EntryQuery: Query criteria for browsing
 * - ProviderCapabilities: What a content provider can do
 * - HistoryFilters: Filter criteria for browsing (legacy, used by UI)
 * - HistorySelectionState: Full selection state
 * - SelectionMode: Derived from selection count
 * - StripMode: Controls which views appear in the strip
 */


import type { WorkoutResults, Section } from '../markdown-editor/types';

/**
 * A stored workout entry in the history.
 */
export interface HistoryEntry {
  id: string;
  title: string;
  createdAt: number;                   // Unix ms — immutable
  updatedAt: number;                   // Unix ms — bumped on edit
  targetDate: number;                  // Unix ms — primary date for view/sorting

  // Source
  rawContent: string;                  // Original markdown

  // Execution results (optional — present after completion)
  // Execution results (optional — present after completion)
  results?: WorkoutResults;

  // Metadata
  tags: string[];
  notes?: string;
  // Pre-parsed segments for instant rendering
  sections?: Section[];
  schemaVersion: number;               // For future migration

  // Note Management
  type?: 'note' | 'template';          // Default to 'note' if undefined
  templateId?: string;                 // ID of the template/note this was cloned from
  clonedIds?: string[];                // IDs of notes cloned FROM this entry (reverse links)
}

/**
 * Query criteria for browsing history entries via IContentProvider.
 */
export interface EntryQuery {
  dateRange?: { start: number; end: number };  // Unix ms
  daysBack?: number;                            // Sugar: "last N days"
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Capabilities that a content provider supports.
 */
export interface ProviderCapabilities {
  canWrite: boolean;
  canDelete: boolean;
  canFilter: boolean;
  canMultiSelect: boolean;
  supportsHistory: boolean;            // false → hides History tab
}

/**
 * Filter criteria for browsing history entries (legacy, used by UI selection hook).
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
