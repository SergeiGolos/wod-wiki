import React, { useMemo } from 'react';
import { useQueryState } from 'nuqs';
import { cn } from '@/lib/utils';

/**
 * WeekCalendarStrip
 *
 * Self-contained 7-day horizontal week strip for the Journal page.
 * Reads and writes the `d` URL parameter (YYYY-MM-DD) so it can be
 * placed anywhere in the layout — including the page shell sticky header —
 * without needing prop-drilled callbacks.
 *
 * Window: 5 days before the reference date, reference date, +1 day.
 */
export const WeekCalendarStrip: React.FC<{ className?: string }> = ({ className }) => {
  const [dateParam, setDateParam] = useQueryState('d', { defaultValue: '' });

  const referenceDate = useMemo(() => {
    if (dateParam) {
      const d = new Date(dateParam);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [dateParam]);

  const days = useMemo(() => {
    const result: Date[] = [];
    const start = new Date(referenceDate);
    start.setDate(referenceDate.getDate() - 5);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      result.push(d);
    }
    return result;
  }, [referenceDate]);

  const handleDayClick = (date: Date) => {
    const iso = date.toISOString().split('T')[0];
    setDateParam(iso);
  };

  return (
    <div className={cn('px-6 lg:px-10 pb-3 overflow-x-auto', className)}>
      <div className="flex justify-between gap-2 min-w-max">
        {days.map((date, i) => {
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = date.toDateString() === referenceDate.toDateString();
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <button
              key={i}
              onClick={() => handleDayClick(date)}
              className={cn(
                'flex flex-col items-center min-w-[60px] p-2 rounded-xl transition-all border-2',
                isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted',
                isWeekend && !isSelected && 'bg-muted/30'
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className={cn('text-lg font-black mt-1', isToday ? 'text-primary' : 'text-foreground')}>
                {date.getDate()}
              </span>
              {isToday && <div className="size-1 rounded-full bg-primary mt-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
