import React, { useState, useEffect, useMemo } from 'react';
import { QueryOrganism, QueryObject, FilteredListItem } from './types';
import { FilteredList } from './FilteredList';

interface QueriableListViewProps {
  QueryOrganism: QueryOrganism;
  initialQuery?: QueryObject;
  items: { id: string; name: string; category: string; content?: string }[];
  results: any[]; // Recent results from IndexedDB
  onSelect: (item: FilteredListItem) => void;
}

export function QueriableListView({ 
  QueryOrganism, 
  initialQuery: externalInitialQuery,
  items, 
  results: historicalResults,
  onSelect 
}: QueriableListViewProps) {
  const [query, setQuery] = useState<QueryObject>(externalInitialQuery || {});

  const filteredItems = useMemo(() => {
    let combined: FilteredListItem[] = [];

    // 1. Add Notes/Templates from Collections
    items.forEach(item => {
      combined.push({
        id: item.id,
        type: 'note',
        title: item.name,
        subtitle: item.category,
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

    if (query.startDate) {
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
  }, [items, historicalResults, query]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      <QueryOrganism onQueryChange={setQuery} initialQuery={externalInitialQuery} />
      <div className="flex-1 overflow-y-auto">
        <FilteredList items={filteredItems} onSelect={onSelect} />
      </div>
    </div>
  );
}
