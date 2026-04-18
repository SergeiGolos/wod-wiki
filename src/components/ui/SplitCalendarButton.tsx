/**
 * SplitCalendarButton
 *
 * Two-sided pill: left = primary action, right = calendar icon that
 * opens a CalendarDatePicker popover for date selection.
 */

import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import type { INavActivation, INavAction } from '@/nav/navTypes';

export interface SplitCalendarButtonProps {
  /** Primary left-hand action */
  primary: INavActivation;
  /** Currently selected date */
  selectedDate: Date | null;
  /** Called when the user picks a date */
  onDateSelect: (date: Date | null) => void;
  /** Dates to highlight (bold) in the calendar */
  /** ISO date strings ("YYYY-MM-DD") to bold in the calendar — matches CalendarDatePicker's Set<string> API */
  entryDates?: Set<string>;
  size?: 'sm' | 'default';
  className?: string;
  /** Override action execution — supply when NavActionDeps are available. */
  onAction?: (action: INavAction, activation: INavActivation) => void;
}

function fireAction(
  activation: INavActivation,
  onAction?: SplitCalendarButtonProps['onAction'],
): void {
  if (onAction) {
    onAction(activation.action, activation);
    return;
  }
  if (activation.action.type === 'call') {
    activation.action.handler();
  }
}

export const SplitCalendarButton: React.FC<SplitCalendarButtonProps> = ({
  primary,
  selectedDate,
  onDateSelect,
  entryDates,
  size = 'default',
  className,
  onAction,
}) => {
  const [open, setOpen] = useState(false);
  const PrimaryIcon = primary.icon;
  const padding = size === 'sm' ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const iconPadding = size === 'sm' ? 'px-2 py-1.5' : 'px-2.5 py-2';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Date';

  return (
    <div
      className={cn(
        'inline-flex items-stretch rounded-lg overflow-hidden border border-border/70',
        'bg-muted text-muted-foreground shadow-sm hover:shadow-md transition-shadow font-medium',
        textSize,
        className,
      )}
    >
      {/* Primary */}
      <button
        type="button"
        title={primary.label}
        onClick={() => fireAction(primary, onAction)}
        className={cn(
          'flex items-center gap-2 transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          padding,
        )}
      >
        {PrimaryIcon && <PrimaryIcon className="h-4 w-4 shrink-0" />}
        <span>{primary.label}</span>
      </button>

      {/* Divider */}
      <div className="w-px bg-border/60 self-stretch" />

      {/* Calendar trigger */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={`Select date — ${dateLabel}`}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              iconPadding,
              selectedDate && 'text-primary',
            )}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            {selectedDate && (
              <span className="leading-none">{dateLabel}</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="p-0 w-auto">
          <CalendarDatePicker
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              onDateSelect(date);
              setOpen(false);
            }}
            entryDates={entryDates}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
