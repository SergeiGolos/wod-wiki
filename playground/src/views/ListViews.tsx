import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { QueriableListView } from './queriable-list/QueriableListView';
import { CalendarQuery } from './queriable-list/CalendarQuery';
import { FilteredList } from './queriable-list/FilteredList';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { useJournalQueryState } from '../hooks/useJournalQueryState';
import type { FilteredListItem } from './queriable-list/types';

interface BaseProps {
  workoutItems: { id: string; name: string; category: string; content?: string }[];
  onSelect: (item: any) => void;
}

export function CalendarPage({ workoutItems, onSelect }: BaseProps) {
  const [month] = useQueryState('month');
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
  const { selectedDate, setDateParam, selectedTags } = useJournalQueryState();
  const [results, setResults] = useState<any[]>([]);
  // Guard to prevent scroll-driven date updates from fighting user clicks
  const isScrollUpdating = useRef(false);

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

  /** Called by FilteredList IntersectionObserver as the user scrolls */
  const handleVisibleDateChange = useCallback(
    (dateKey: string) => {
      if (dateKey && dateKey !== 'no-date') {
        isScrollUpdating.current = true;
        setDateParam(dateKey);
        // Release the guard after a tick so React can reconcile
        requestAnimationFrame(() => {
          isScrollUpdating.current = false;
        });
      }
    },
    [setDateParam],
  );

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

    let items = combined;

    // Filter by selected tags when present
    if (selectedTags.length > 0) {
      items = items.filter((item) => {
        const category = (item.subtitle || '').toLowerCase();
        const title = item.title.toLowerCase();
        return selectedTags.some(
          (tag) => category.includes(tag.toLowerCase()) || title.includes(tag.toLowerCase()),
        );
      });
    }

    return items.sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [workoutItems, results, selectedTags]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-card">
      <FilteredList
        items={allItems}
        onSelect={handleSelect}
        selectedDate={selectedDate}
        onVisibleDateChange={handleVisibleDateChange}
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
