import React, { useMemo } from 'react';
import { CalendarPlus } from 'lucide-react';
import { QueriableListView } from './QueriableListView';
import { FuzzySearchQuery } from './FuzzySearchQuery';
import type { FilteredListItem } from './types';
import type { WorkoutItem } from '../../App';
import { SplitCalendarButton } from '@/components/ui/SplitCalendarButton';

interface CollectionWorkoutsListProps {
  category: string;
  workoutItems: WorkoutItem[];
  onSelect: (item: WorkoutItem) => void;
  onSchedule?: (item: WorkoutItem, date: Date) => void;
}

export const CollectionWorkoutsList: React.FC<CollectionWorkoutsListProps> = ({ 
  category, 
  workoutItems, 
  onSelect,
  onSchedule
}) => {
  // Filter items to just this collection, excluding README files
  const collectionItems = useMemo(() => 
    workoutItems.filter(item => item.category === category && item.name.toLowerCase() !== 'readme'),
    [workoutItems, category]
  );

  const handleSelect = (item: FilteredListItem) => {
    onSelect(item.payload as WorkoutItem);
  };

  const renderItemActions = onSchedule
    ? (item: FilteredListItem) => {
        const workout = item.payload as WorkoutItem;
        return (
          <SplitCalendarButton
            primary={{
              id: `schedule-${item.id}`,
              label: 'Today',
              icon: CalendarPlus,
              action: { type: 'call', handler: () => onSchedule(workout, new Date()) },
            }}
            selectedDate={null}
            onDateSelect={(date) => date && onSchedule(workout, date)}
            size="sm"
          />
        );
      }
    : undefined;

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-border bg-card overflow-hidden shadow-2xl shadow-black/5 transition-all hover:border-primary/20">
      <QueriableListView
        QueryOrganism={FuzzySearchQuery}
        items={collectionItems}
        results={[]}
        onSelect={handleSelect}
        renderItemActions={renderItemActions}
        initialQuery={{}}
        hideBackground
        className="flex-1"
      />
    </div>
  );
};
