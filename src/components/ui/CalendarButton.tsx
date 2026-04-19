/**
 * CalendarButton — Single button with a calendar icon that opens a popover
 * containing a CalendarCard for date selection.
 */

import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarCard } from '@/components/ui/CalendarCard';

export interface CalendarButtonProps {
  /** Currently selected date */
  selectedDate: Date | null;
  /** Called when the user picks a date */
  onDateSelect: (date: Date | null) => void;
  /** ISO date strings ("YYYY-MM-DD") to highlight in the calendar */
  entryDates?: Set<string>;
  size?: 'sm' | 'default';
  /** When true, renders as read-only — non-interactive, visually dimmed */
  disabled?: boolean;
  className?: string;
}

export const CalendarButton: React.FC<CalendarButtonProps> = ({
  selectedDate,
  onDateSelect,
  entryDates,
  size = 'default',
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);

  const padding = size === 'sm' ? 'px-2 py-1.5' : 'px-2.5 py-2';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <DropdownMenu open={open && !disabled} onOpenChange={disabled ? undefined : setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={dateLabel ? `Selected: ${dateLabel}` : 'Select date'}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-border/70',
            'bg-muted text-muted-foreground shadow-sm hover:shadow-md transition-shadow font-medium',
            'hover:bg-accent hover:text-accent-foreground transition-colors',
            'disabled:opacity-60 disabled:pointer-events-none',
            textSize,
            padding,
            selectedDate && 'text-primary',
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          {dateLabel && <span className="leading-none">{dateLabel}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-0 w-auto">
        <CalendarCard
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            onDateSelect(date);
            setOpen(false);
          }}
          entryDates={entryDates}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
