/**
 * CalendarDatePicker — Compact inline month-view calendar for dropdown contexts
 *
 * Designed to be embedded inside dropdown menus.
 * Shows a month grid, highlights today, supports single date selection.
 * Optionally shows dots/highlights for dates that have entries.
 */

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CalendarDatePickerProps {
  /** Currently selected date (if any) */
  selectedDate?: Date | null;
  /** Callback when a date is picked */
  onDateSelect: (date: Date) => void;
  /** Dates that have entries (highlighted with dot) */
  entryDates?: Set<string>; // ISO date strings "YYYY-MM-DD"
  /** Optional className */
  className?: string;
}

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toDateKey(date: Date): string {
  return formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  selectedDate,
  onDateSelect,
  entryDates = new Set(),
  className,
}) => {
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setViewDate(new Date(year, month + 1, 1));
  };

  const monthLabel = viewDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  const todayKey = toDateKey(new Date());

  return (
    <div className={cn('select-none px-2 py-1', className)} onClick={(e) => e.stopPropagation()}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={prevMonth}
          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-medium text-foreground">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {DAY_NAMES.map(day => (
          <div key={day} className="text-center text-[9px] text-muted-foreground font-medium py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px">
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dateKey = formatDateKey(year, month, day);
          const hasEntry = entryDates.has(dateKey);
          const isSelected = dateKey === selectedKey;
          const isToday = dateKey === todayKey;

          return (
            <button
              key={dateKey}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDateSelect(new Date(year, month, day));
              }}
              className={cn(
                'aspect-square flex items-center justify-center rounded text-[10px] transition-colors relative',
                // Selected state
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold'
                  : isToday
                    ? 'font-bold text-primary ring-1 ring-primary/40'
                    : hasEntry
                      ? 'font-semibold text-foreground hover:bg-muted'
                      : 'text-muted-foreground hover:bg-muted/50',
              )}
              aria-label={`${day} ${monthLabel}${hasEntry ? ' (has entries)' : ''}`}
            >
              {day}
              {/* Entry dot indicator */}
              {hasEntry && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
