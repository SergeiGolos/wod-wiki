import React from 'react';
import { cn } from '@/lib/utils';
import { CalendarWidget } from '../history/CalendarWidget';
import { Button } from '@/components/ui/button';
import { BookOpen, Dumbbell, Tag, Layers, X } from 'lucide-react';
import type { Notebook } from '@/types/notebook';

export interface ListFilterProps {
    /** Current calendar date */
    calendarDate: Date;
    /** Calendar date change handler */
    onCalendarDateChange: (date: Date) => void;
    /** Date filter handler */
    onDateSelect?: (date: Date, modifiers: { shiftKey: boolean; ctrlKey: boolean }) => void;
    /** Dates that have entries */
    entryDates: Set<string>;
    /** Selected dates for filtering */
    selectedDates?: Set<string>;

    /** Notebooks for filtering */
    notebooks: Notebook[];
    activeNotebookId: string | null;
    onNotebookSelect: (id: string | null) => void;

    /** Reset all filters */
    onResetFilters?: () => void;

    /** Optional actions to render in the filter sidebar */
    className?: string;

    /** Compact mode (for mobile/narrow views) */
    compact?: boolean;

    /** Selected IDs for bulk actions */
    selectedIds?: Set<string>;
    onSelectAll?: () => void;
    onClearSelection?: () => void;
}

export const ListFilter: React.FC<ListFilterProps> = ({
    calendarDate,
    onCalendarDateChange,
    onDateSelect,
    entryDates,
    selectedDates,
    notebooks,
    activeNotebookId,
    onNotebookSelect,
    onResetFilters,
    className,
    compact = false,
    selectedIds,
    onSelectAll,
    onClearSelection,
}) => {
    return (
        <div className={cn("flex flex-col gap-6", className)}>
            <div className="space-y-4">
                <CalendarWidget
                    currentDate={calendarDate}
                    onDateChange={onCalendarDateChange}
                    onDateSelect={onDateSelect}
                    entryDates={entryDates}
                    selectedDates={selectedDates}
                    compact={compact}
                />

                {/* Reset Filters */}
                {onResetFilters && (
                    <Button
                        onClick={onResetFilters}
                        className="w-full gap-2 text-muted-foreground hover:text-foreground"
                        variant="outline"
                        size="sm"
                    >
                        <X className="h-4 w-4" />
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* Notebooks Section */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-3 w-3" />
                    Notebooks
                </h3>
                <div className="space-y-0.5">
                    <button
                        onClick={() => onNotebookSelect(null)}
                        className={cn(
                            "w-full text-left text-sm px-2 py-1.5 rounded transition-colors flex items-center gap-2",
                            activeNotebookId === null
                                ? "bg-accent text-accent-foreground font-medium"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <span>📚</span>
                        <span>All Workouts</span>
                    </button>
                    {notebooks.map(nb => (
                        <button
                            key={nb.id}
                            onClick={() => onNotebookSelect(nb.id)}
                            className={cn(
                                "w-full text-left text-sm px-2 py-1.5 rounded transition-colors flex items-center gap-2",
                                activeNotebookId === nb.id
                                    ? "bg-accent text-accent-foreground font-medium"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span>{nb.icon}</span>
                            <span className="truncate">{nb.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Placeholder Sections */}
            <div className="space-y-4 opacity-50">
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <Dumbbell className="h-3 w-3" />
                        Equipment
                    </h3>
                    <div className="text-xs text-muted-foreground px-2 italic">No filters</div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <Layers className="h-3 w-3" />
                        Discipline
                    </h3>
                    <div className="text-xs text-muted-foreground px-2 italic">No filters</div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <Tag className="h-3 w-3" />
                        Tags
                    </h3>
                    <div className="text-xs text-muted-foreground px-2 italic">No filters</div>
                </div>
            </div>

            {/* Bulk Actions state */}
            {!compact && selectedIds && selectedIds.size > 0 && (
                <div className="space-y-2 border-t border-border pt-4 mt-auto">
                    <div className="text-xs font-medium text-foreground px-2 mb-2">
                        Selection ({selectedIds.size})
                    </div>
                    <div className="flex gap-2">
                        {onSelectAll && (
                            <Button
                                onClick={onSelectAll}
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-7 text-xs"
                            >
                                Select All
                            </Button>
                        )}
                        {onClearSelection && (
                            <Button
                                onClick={onClearSelection}
                                variant="ghost"
                                size="sm"
                                className="flex-1 text-muted-foreground h-7 text-xs"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
