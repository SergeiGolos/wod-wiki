/**
 * JournalImportToolbar
 *
 * Split button toolbar for journal zip-load import actions.
 * Primary: Import for Today
 * Dropdown: Plan for Future (date picker)
 */

import React, { useState } from 'react';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarCard } from '@/components/ui/CalendarCard';
import { usePopoverAlign } from '@/hooks/usePopoverAlign';

export interface JournalImportToolbarProps {
  /** Currently selected date (for pre-selection in picker) */
  selectedDate?: Date | null;
  /** Called when user clicks "Import for Today" */
  onImportToday: () => Promise<void>;
  /** Called when user selects a date from the picker */
  onDateSelect: (date: Date) => Promise<void>;
  /** ISO date strings to highlight in calendar */
  entryDates?: Set<string>;
  /** Whether an import is in progress */
  isLoading?: boolean;
  /** CSS class for custom styling */
  className?: string;
}

export const JournalImportToolbar: React.FC<JournalImportToolbarProps> = ({
  selectedDate,
  onImportToday,
  onDateSelect,
  entryDates,
  isLoading = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const { triggerRef, align, recompute } = usePopoverAlign('end');
  
  const handleImportToday = async () => {
    setImporting(true);
    try {
      await onImportToday();
    } finally {
      setImporting(false);
    }
  };

  const handleDateSelect = async (date: Date) => {
    setImporting(true);
    setOpen(false);
    try {
      await onDateSelect(date);
    } finally {
      setImporting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (next) recompute();
    setOpen(next);
  };

  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Date';

  const isDisabled = isLoading || importing;

  return (
    <div
      className={cn(
        'inline-flex items-stretch rounded-lg overflow-hidden border border-border/70',
        'bg-muted text-muted-foreground shadow-sm hover:shadow-md transition-shadow font-medium',
        'text-xs',
        className,
      )}
    >
      {/* Primary: Import for Today */}
      <button
        type="button"
        title="Import to today's journal"
        onClick={handleImportToday}
        disabled={isDisabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isDisabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        {importing ? (
          <span className="inline-block animate-spin">⏳</span>
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        )}
        <span>Import Today</span>
      </button>

      {/* Divider */}
      <div className="w-px bg-border/60 self-stretch" />

      {/* Date picker trigger */}
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            ref={el => { triggerRef.current = el; }}
            type="button"
            title="Select a date to plan for the future"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-2 transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              selectedDate && 'text-primary',
              isDisabled && 'opacity-60 cursor-not-allowed',
            )}
            disabled={isDisabled}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            {selectedDate && (
              <span className="leading-none text-xs">{dateLabel}</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="p-0 w-auto">
          <CalendarCard
            selectedDate={selectedDate || null}
            onDateSelect={handleDateSelect}
            entryDates={entryDates}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
