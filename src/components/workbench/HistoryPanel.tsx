/**
 * HistoryPanel - Browse, search, and select stored workout entries
 *
 * Responsive layout by span:
 * - 1/3 (flex:1): Compact sidebar — calendar on top, scrolling list below
 * - 2/3 (flex:2): Split view — calendar+filters left, post list right
 * - Full (flex:3): Expanded — 1/3 calendar+filters+bulk actions, 2/3 enriched list
 *
 * Combines CalendarWidget, filter controls, and HistoryPostList.
 * Checkmarks enable single or multi-select behavior.
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CalendarWidget } from '../history/CalendarWidget';
import { HistoryPostList } from '../history/HistoryPostList';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HistoryEntry, HistoryFilters, StripMode } from '@/types/history';
import type { PanelSpan } from '../layout/panel-system/types';

export interface HistoryPanelProps {
  /** Current panel span */
  span?: PanelSpan;
  /** History entries to display */
  entries: HistoryEntry[];
  /** Currently selected entry IDs */
  selectedIds: Set<string>;
  /** Toggle entry selection */
  onToggleEntry: (id: string) => void;
  /** Select all visible entries */
  onSelectAll?: (ids: string[]) => void;
  /** Clear all selections */
  onClearSelection?: () => void;
  /** Current calendar date */
  calendarDate: Date;
  /** Calendar date change handler */
  onCalendarDateChange: (date: Date) => void;
  /** Date filter handler */
  onDateSelect?: (date: Date) => void;
  /** Current filters */
  filters?: HistoryFilters;
  /** Filter change handler */
  onFiltersChange?: (filters: Partial<HistoryFilters>) => void;
  /** Current strip mode for layout hints */
  stripMode?: StripMode;
  /** Handler for creating a new workout entry */
  onCreateNewEntry?: () => void;
  /** Whether the create button should be shown */
  canCreate?: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  span = 3,
  entries,
  selectedIds,
  onToggleEntry,
  onSelectAll,
  onClearSelection,
  calendarDate,
  onCalendarDateChange,
  onDateSelect,
  onCreateNewEntry,
  canCreate = false,
}) => {
  // Derive entry dates for calendar highlighting
  const entryDates = useMemo(() => {
    const dates = new Set<string>();
    entries.forEach(entry => {
      const d = new Date(entry.updatedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.add(key);
    });
    return dates;
  }, [entries]);

  const visibleIds = useMemo(() => entries.map(e => e.id), [entries]);

  const isCompact = span === 1;
  const isExpanded = span === 3;

  // Compact (1/3): Single column, calendar + scrolling list
  if (isCompact) {
    return (
      <div className="h-full flex flex-col overflow-y-auto bg-background">
        <div className="p-3 border-b border-border">
          <CalendarWidget
            currentDate={calendarDate}
            onDateChange={onCalendarDateChange}
            onDateSelect={onDateSelect}
            entryDates={entryDates}
            compact
          />
          {canCreate && onCreateNewEntry && (
            <Button
              onClick={onCreateNewEntry}
              className="w-full mt-3 gap-2"
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New Workout
            </Button>
          )}
        </div>
        <div className="flex-1">
          <HistoryPostList
            entries={entries}
            selectedIds={selectedIds}
            onToggle={onToggleEntry}
          />
        </div>
      </div>
    );
  }

  // Split (2/3) or Expanded (full): Side-by-side layout
  return (
    <div className="h-full flex bg-background">
      {/* Left column: Calendar + Filters + Bulk Actions */}
      <div className={cn(
        'border-r border-border overflow-y-auto p-3 flex flex-col gap-3',
        isExpanded ? 'w-1/3' : 'w-1/2',
      )}>
        <CalendarWidget
          currentDate={calendarDate}
          onDateChange={onCalendarDateChange}
          onDateSelect={onDateSelect}
          entryDates={entryDates}
        />

        {/* Create New Workout Button */}
        {canCreate && onCreateNewEntry && (
          <Button
            onClick={onCreateNewEntry}
            className="w-full gap-2"
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New Workout
          </Button>
        )}

        {/* Bulk Actions (expanded only) */}
        {isExpanded && (
          <div className="space-y-2 border-t border-border pt-3">
            <button
              onClick={() => onSelectAll?.(visibleIds)}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              ✓ Select All
            </button>
            <button
              onClick={() => onClearSelection?.()}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear Selection
            </button>
            {selectedIds.size > 0 && (
              <div className="text-xs text-muted-foreground px-2">
                Selected: {selectedIds.size}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right column: Post list */}
      <div className={cn(
        'overflow-y-auto',
        isExpanded ? 'w-2/3' : 'w-1/2',
      )}>
        <HistoryPostList
          entries={entries}
          selectedIds={selectedIds}
          onToggle={onToggleEntry}
          enriched={isExpanded}
        />
      </div>
    </div>
  );
};
