/**
 * CalendarWidget - Month-view calendar for history browsing
 *
 * Features:
 * - Highlights dates with stored entries
 * - Compact mode (no day names, smaller cells) for 1/3 span
 * - Full mode (day names, larger cells) for 2/3+ span
 * - Month/year navigation
 * - Emits onDateSelect for filtering
 */

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CalendarWidgetProps {
  /** Currently viewed month */
  currentDate: Date;
  /** Callback when month changes */
  onDateChange: (date: Date) => void;
  /** Callback when a specific date is selected */
  onDateSelect?: (date: Date) => void;
  /** Dates that have entries (highlighted) */
  entryDates?: Set<string>; // ISO date strings (YYYY-MM-DD)
  /** Currently selected/filtered date */
  selectedDate?: Date | null;
  /** Compact mode for narrow layouts */
  compact?: boolean;
}

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0=Sunday, convert to Mon=0
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  currentDate,
  onDateChange,
  onDateSelect,
  entryDates = new Set(),
  selectedDate,
  compact = false,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Day numbers
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    return days;
  }, [year, month]);

  const selectedDateKey = selectedDate
    ? formatDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    : null;

  const prevMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const monthLabel = currentDate.toLocaleDateString('en-US', {
    month: compact ? 'short' : 'long',
    year: 'numeric',
  });

  return (
    <div className={cn('select-none', compact ? 'text-xs' : 'text-sm')}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        </button>
        <span className="font-medium text-foreground">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        </button>
      </div>

      {/* Day Names (hidden in compact mode) */}
      {!compact && (
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_NAMES.map(day => (
            <div key={day} className="text-center text-muted-foreground font-medium py-0.5">
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const dateKey = formatDateKey(year, month, day);
          const hasEntry = entryDates.has(dateKey);
          const isSelected = dateKey === selectedDateKey;
          const isToday =
            day === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();

          return (
            <button
              key={dateKey}
              onClick={() => onDateSelect?.(new Date(year, month, day))}
              className={cn(
                'aspect-square flex items-center justify-center rounded transition-colors',
                compact ? 'text-[10px]' : 'text-xs',
                hasEntry
                  ? 'font-bold text-foreground'
                  : 'text-muted-foreground',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && hasEntry && 'hover:bg-muted',
                !isSelected && !hasEntry && 'hover:bg-muted/50',
                isToday && !isSelected && 'ring-1 ring-primary/50',
              )}
              aria-label={`${day} ${monthLabel}${hasEntry ? ' (has entries)' : ''}`}
            >
              {hasEntry && !compact ? day : hasEntry ? day : '·'}
            </button>
          );
        })}
      </div>
    </div>
  );
};
