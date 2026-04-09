import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryState, parseAsArrayOf, parseAsStringEnum, parseAsTimestamp } from 'nuqs';
import { QueriableListView } from './queriable-list/QueriableListView';
import { CalendarQuery } from './queriable-list/CalendarQuery';
import { FuzzySearchQuery } from './queriable-list/FuzzySearchQuery';
import { FilteredList } from './queriable-list/FilteredList';
import { indexedDBService } from '@/services/db/IndexedDBService';
import type { FilteredListItem, QueryObject } from './queriable-list/types';

interface BaseProps {
  workoutItems: { id: string; name: string; category: string; content?: string }[];
  onSelect: (item: any) => void;
}

export function CalendarPage({ workoutItems, onSelect }: BaseProps) {
  const [month, setMonth] = useQueryState('month');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    indexedDBService.getRecentResults(100).then(setResults);
  }, []);

  const initialQuery = useMemo(() => {
    if (!month) return undefined;
    const [y, m] = month.split('-').map(Number);
    return { startDate: new Date(y, m - 1, 1) };
  }, [month]);

  const navigate = useNavigate();
  const handleSelect = (item: FilteredListItem) => {
    if (item.type === 'result') {
      navigate(`/review/${item.id}`);
    } else {
      onSelect(item.payload);
    }
  };

  return (
    <QueriableListView
      QueryOrganism={CalendarQuery}
      items={workoutItems}
      results={results}
      onSelect={handleSelect}
      initialQuery={initialQuery}
      disableDateFiltering={true}
    />
  );
}

export function JournalWeeklyPage({ workoutItems, onSelect }: BaseProps) {
  const [dateParam] = useQueryState('d');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    indexedDBService.getRecentResults(100).then(setResults);
  }, []);

  const referenceDate = useMemo(() => {
    if (dateParam) {
      const d = new Date(dateParam);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [dateParam]);

  const navigate = useNavigate();
  const handleSelect = (item: FilteredListItem) => {
    if (item.type === 'result') {
      navigate(`/review/${item.id}`);
    } else {
      onSelect(item.payload);
    }
  };

  const allItems = useMemo(() => {
    const combined: FilteredListItem[] = [];
    workoutItems.forEach(item => {
      combined.push({
        id: item.id,
        type: 'note',
        title: item.name,
        subtitle: item.category,
        date: (item as any).targetDate || (item as any).updatedAt,
        payload: item,
      });
    });
    results.forEach(r => {
      combined.push({
        id: r.id,
        type: 'result',
        title: r.noteId.split('/').pop() || r.noteId,
        subtitle: r.data?.completed ? 'Completed session' : 'Partial session',
        date: r.completedAt,
        payload: r,
      });
    });
    return combined.sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [workoutItems, results]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-card">
      <FilteredList
        items={allItems}
        onSelect={handleSelect}
        selectedDate={referenceDate}
      />
    </div>
  );
}

export function SearchPage({ workoutItems, onSelect }: BaseProps) {
  const [query] = useQueryState('q', { defaultValue: '' });
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    indexedDBService.getRecentResults(100).then(setResults);
  }, []);

  const navigate = useNavigate();
  const handleSelect = (item: FilteredListItem) => {
    if (item.type === 'result') {
      navigate(`/review/${item.id}`);
    } else {
      onSelect(item.payload);
    }
  };

  const filteredItems = useMemo(() => {
    const combined: FilteredListItem[] = [];
    workoutItems.forEach(item => {
      combined.push({
        id: item.id,
        type: 'note',
        title: item.name,
        subtitle: item.category,
        date: (item as any).targetDate || (item as any).updatedAt,
        payload: item,
      });
    });
    results.forEach(r => {
      combined.push({
        id: r.id,
        type: 'result',
        title: r.noteId.split('/').pop() || r.noteId,
        subtitle: r.data?.completed ? 'Completed session' : 'Partial session',
        date: r.completedAt,
        payload: r,
      });
    });

    const q = query.trim().toLowerCase();
    const visible = q
      ? combined.filter(
          item =>
            item.title.toLowerCase().includes(q) ||
            item.subtitle?.toLowerCase().includes(q),
        )
      : combined;

    return visible.sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [workoutItems, results, query]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-card">
      <FilteredList items={filteredItems} onSelect={handleSelect} />
    </div>
  );
}
