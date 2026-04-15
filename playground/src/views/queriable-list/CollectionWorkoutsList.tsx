import React, { useMemo } from 'react';
import { QueriableListView } from './QueriableListView';
import { FuzzySearchQuery } from './FuzzySearchQuery';
import { FilteredListItem } from './types';
import type { WorkoutItem } from '../../App';

interface CollectionWorkoutsListProps {
  category: string;
  workoutItems: WorkoutItem[];
  onSelect: (item: WorkoutItem) => void;
  onClone?: (item: WorkoutItem, date: Date) => void;
}

export const CollectionWorkoutsList: React.FC<CollectionWorkoutsListProps> = ({ 
  category, 
  workoutItems, 
  onSelect,
  onClone
}) => {
  // Filter items to just this collection, excluding README files
  const collectionItems = useMemo(() => 
    workoutItems.filter(item => item.category === category && item.name.toLowerCase() !== 'readme'),
    [workoutItems, category]
  );

  const handleSelect = (item: FilteredListItem) => {
    onSelect(item.payload as WorkoutItem);
  };

  const handleClone = (item: FilteredListItem, date: Date) => {
    onClone?.(item.payload as WorkoutItem, date);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-3xl border border-border bg-card overflow-hidden shadow-2xl shadow-black/5 transition-all hover:border-primary/20">
      <QueriableListView
        QueryOrganism={FuzzySearchQuery}
        items={collectionItems}
        results={[]}
        onSelect={handleSelect}
        onClone={onClone ? handleClone : undefined}
        initialQuery={{}}
        hideBackground
        className="flex-1"
      />
    </div>
  );
};
