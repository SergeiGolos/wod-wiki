import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { QueryOrganismProps } from './types';

export const WeekPlannerQuery: React.FC<QueryOrganismProps> = ({ onQueryChange, initialQuery }) => {
  const referenceDate = initialQuery?.startDate || new Date();
  
  const days = useMemo(() => {
    const result = [];
    // 4 days back, today, 1 day forward = 6 days? 
    // User said: "4 days back, today and tomorrow in a planner view... second to last day in the 7 day view"
    // Day 1, 2, 3, 4, 5, [Today (6)], Tomorrow (7)
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
    onQueryChange({ ...initialQuery, startDate: date, endDate: date });
  };

  return (
    <div className="bg-card border-b border-border px-4 py-3 overflow-x-auto">
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
                "flex flex-col items-center min-w-[60px] p-2 rounded-xl transition-all border-2",
                isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted",
                isWeekend && !isSelected && "bg-muted/30"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className={cn(
                "text-lg font-black mt-1",
                isToday ? "text-primary" : "text-foreground"
              )}>
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
