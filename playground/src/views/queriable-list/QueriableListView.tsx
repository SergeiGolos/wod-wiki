import React, { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { QueryOrganism, QueryObject, FilteredListItem } from './types';
import { FilteredList } from './FilteredList';

interface QueriableListViewProps {
  QueryOrganism: QueryOrganism;
  initialQuery?: QueryObject;
  items: { id: string; name: string; category: string; content?: string }[];
  results: any[]; // Recent results from IndexedDB
  onSelect: (item: FilteredListItem) => void;
  onClone?: (item: FilteredListItem, date: Date) => void;
  className?: string;
  hideBackground?: boolean;
  disableDateFiltering?: boolean;
}

export function QueriableListView({ 
  QueryOrganism, 
  initialQuery: externalInitialQuery,
  items, 
  results: historicalResults,
  onSelect,
  onClone,
  className,
  hideBackground,
  disableDateFiltering
}: QueriableListViewProps) {
  const [query, setQuery] = useState<QueryObject>(externalInitialQuery || {});
  const queryRef = useRef<HTMLDivElement>(null);
  const [queryHeight, setQueryHeight] = useState(0);

  useEffect(() => {
    const el = queryRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setQueryHeight(entries[0].borderBoxSize[0].blockSize);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const filteredItems = useMemo(() => {
    let combined: FilteredListItem[] = [];

    // 1. Add Notes/Templates from Collections
    items.forEach(item => {
      combined.push({
        id: item.id,
        type: 'note',
        title: item.name,
        subtitle: item.category,
        date: (item.payload as any)?.targetDate || (item.payload as any)?.updatedAt,
        payload: item
      });
    });

    // 2. Add Historical Results
    historicalResults.forEach(r => {
      combined.push({
        id: r.id,
        type: 'result',
        title: r.noteId.split('/').pop() || r.noteId,
        subtitle: r.data?.completed ? 'Completed session' : 'Partial session',
        date: r.completedAt,
        payload: r
      });
    });

    // Apply Query
    if (query.text) {
      const q = query.text.toLowerCase();
      combined = combined.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.subtitle?.toLowerCase().includes(q)
      );
    }

    if (query.startDate && !disableDateFiltering) {
      const start = new Date(query.startDate).setHours(0,0,0,0);
      const end = query.endDate ? new Date(query.endDate).setHours(23,59,59,999) : new Date(query.startDate).setHours(23,59,59,999);
      
      combined = combined.filter(item => {
        if (!item.date) return false;
        return item.date >= start && item.date <= end;
      });
    }

    if (query.types && query.types.length > 0) {
      combined = combined.filter(item => query.types!.includes(item.type));
    }

    // Sort by date (descending)
    return combined.sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [items, historicalResults, query, disableDateFiltering]);

  return (
    <div
      className={cn(
        "flex-1 min-h-0 overflow-y-auto",
        !hideBackground && "bg-card",
        className
      )}
      style={{ scrollPaddingTop: `${queryHeight}px` }}
    >
      <div ref={queryRef} className="sticky top-0 z-20">
        <QueryOrganism onQueryChange={setQuery} initialQuery={externalInitialQuery} />
      </div>
      <FilteredList 
        items={filteredItems} 
        onSelect={onSelect} 
        onClone={onClone}
        selectedDate={query.startDate}
        stickyOffset={queryHeight}
      />
    </div>
  );
}
