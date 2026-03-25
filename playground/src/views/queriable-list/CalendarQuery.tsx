import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/20/solid';
import { ArrowRightIcon } from 'lucide-react';
import type { QueryOrganismProps } from './types';

function toInputValue(date: Date | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function fromInputValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const CalendarQuery: React.FC<QueryOrganismProps> = ({ onQueryChange, initialQuery }) => {
  const defaultStart = initialQuery?.startDate
    ? toInputValue(initialQuery.startDate)
    : toInputValue(new Date());
  const defaultEnd = initialQuery?.endDate
    ? toInputValue(initialQuery.endDate)
    : defaultStart;

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  const emit = useCallback((s: string, e: string) => {
    const startDate = fromInputValue(s);
    const endDate = fromInputValue(e) ?? startDate;
    onQueryChange({ ...initialQuery, startDate, endDate });
  }, [onQueryChange, initialQuery]);

  useEffect(() => {
    emit(start, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = (v: string) => {
    setStart(v);
    // If end is before the new start, move end to match start
    const newEnd = end < v ? v : end;
    setEnd(newEnd);
    emit(v, newEnd);
  };

  const handleEnd = (v: string) => {
    setEnd(v);
    // If start is after the new end, move start to match end
    const newStart = start > v ? v : start;
    setStart(newStart);
    emit(newStart, v);
  };

  return (
    <div className="bg-card border-b border-border px-4 py-2.5 flex items-center gap-2">
      <CalendarDaysIcon className="size-4 text-muted-foreground shrink-0" />
      <input
        type="date"
        value={start}
        onChange={e => handleStart(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
      />
      <ArrowRightIcon className="size-3 text-muted-foreground shrink-0" />
      <input
        type="date"
        value={end}
        min={start}
        onChange={e => handleEnd(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
      />
    </div>
  );
};
