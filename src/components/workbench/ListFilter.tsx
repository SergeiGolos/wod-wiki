import React from 'react';
import { cn } from '@/lib/utils';
import { CalendarWidget } from '../history/CalendarWidget';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export interface ListFilterProps {
    /** Current calendar date */
    calendarDate: Date;
    /** Calendar date change handler */
    onCalendarDateChange: (date: Date) => void;
    /** Date filter handler */
    onDateSelect?: (date: Date) => void;
    /** Dates that have entries */
    entryDates: Set<string>;

    /** Optional actions to render in the filter sidebar */
    className?: string;

    /** Compact mode (for mobile/narrow views) */
    compact?: boolean;

    /** Selected IDs for bulk actions */
    selectedIds?: Set<string>;
    /** Bulk action handlers */
    onSelectAll?: () => void;
    onClearSelection?: () => void;

    /** Create entry (often placed near filters/calendar in some layouts) */
    onCreateNewEntry?: () => void;
    canCreate?: boolean;
}

export const ListFilter: React.FC<ListFilterProps> = ({
    calendarDate,
    onCalendarDateChange,
    onDateSelect,
    entryDates,
    className,
    compact = false,
    selectedIds,
    onSelectAll,
    onClearSelection,
    onCreateNewEntry,
    canCreate,
}) => {
    return (
        <div className={cn("flex flex-col gap-3", className)}>
            <CalendarWidget
                currentDate={calendarDate}
                onDateChange={onCalendarDateChange}
                onDateSelect={onDateSelect}
                entryDates={entryDates}
                compact={compact}
            />

            {/* Create Action (if placed here) */}
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

            {/* Bulk Actions state */}
            {!compact && selectedIds && (
                <div className="space-y-2 border-t border-border pt-3">
                    {onSelectAll && (
                        <button
                            onClick={onSelectAll}
                            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ✓ Select All
                        </button>
                    )}
                    {onClearSelection && (
                        <button
                            onClick={onClearSelection}
                            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Clear Selection
                        </button>
                    )}
                    {selectedIds.size > 0 && (
                        <div className="text-xs text-muted-foreground px-2">
                            Selected: {selectedIds.size}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
