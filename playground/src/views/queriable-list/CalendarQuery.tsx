import React, { useState, useEffect } from 'react';
import { CalendarWidget } from '@/components/history/CalendarWidget';
import type { QueryOrganismProps } from './types';

export const CalendarQuery: React.FC<QueryOrganismProps> = ({ onQueryChange, initialQuery }) => {
  const [currentDate, setCurrentDate] = useState(initialQuery?.startDate || new Date());
  const [lastSelectedDate, setLastSelectedDate] = useState<Date | undefined>(initialQuery?.startDate);

  useEffect(() => {
    // When month changes, trigger query for the month range
    // BUT if we just selected a specific date, we want that to be the startDate for scrolling
    const start = lastSelectedDate || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    onQueryChange({
      ...initialQuery,
      startDate: start,
      endDate: end,
    });
  }, [currentDate, lastSelectedDate, onQueryChange, initialQuery]);

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10 p-4">
      <div className="max-w-md mx-auto">
        <CalendarWidget
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onDateSelect={(date) => {
            setLastSelectedDate(date);
          }}
          selectedDates={lastSelectedDate ? new Set([lastSelectedDate.toISOString().split('T')[0]]) : new Set()}
          compact={true}
        />
      </div>
    </div>
  );
};
