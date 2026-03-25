import React, { useState, useEffect } from 'react';
import { CalendarWidget } from '@/components/history/CalendarWidget';
import type { QueryOrganismProps } from './types';

export const CalendarQuery: React.FC<QueryOrganismProps> = ({ onQueryChange, initialQuery }) => {
  const [currentDate, setCurrentDate] = useState(initialQuery?.startDate || new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    // When month changes or dates selected, trigger query
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    onQueryChange({
      ...initialQuery,
      startDate: start,
      endDate: end,
      // If specific dates selected, we could pass them too
    });
  }, [currentDate, selectedDates, onQueryChange, initialQuery]);

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10 p-4">
      <div className="max-w-md mx-auto">
        <CalendarWidget
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onDateSelect={(date, modifiers) => {
            const d = date.toISOString().split('T')[0];
            setSelectedDates(prev => {
                const next = new Set(prev);
                if (next.has(d)) next.delete(d);
                else next.add(d);
                return next;
            });
          }}
          selectedDates={selectedDates}
          compact={true}
        />
      </div>
    </div>
  );
};
