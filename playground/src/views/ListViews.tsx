import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryState } from 'nuqs';
import { FilteredList } from './queriable-list/FilteredList';
import { JournalDateScroll, localDateKey, type JournalDateScrollHandle } from './queriable-list/JournalDateScroll';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { useJournalQueryState } from '../hooks/useJournalQueryState';
import type { FilteredListItem } from './queriable-list/types';

interface BaseProps {
  workoutItems: { id: string; name: string; category: string; content?: string }[];
  onSelect: (item: any) => void;
}

interface JournalWeeklyPageProps extends BaseProps {
  onCreateEntry: (date: Date) => void;
}

export function JournalWeeklyPage({ workoutItems, onSelect, onCreateEntry }: JournalWeeklyPageProps) {
  const { selectedDate, setDateParam, selectedTags } = useJournalQueryState();
  const [results, setResults] = useState<any[]>([]);
  const scrollRef = useRef<JournalDateScrollHandle>(null);

  // Seed with the initial date so the first-render effect doesn't trigger a
  // redundant scroll — JournalDateScroll already centers the date on mount.
  const lastIODateRef = useRef<string>(selectedDate ? localDateKey(selectedDate) : '');

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

  /** Called by JournalDateScroll IO as the user scrolls — updates URL only, never triggers re-scroll. */
  const handleVisibleDateChange = useCallback(
    (dateKey: string) => {
      if (dateKey && dateKey !== 'no-date') {
        lastIODateRef.current = dateKey;
        setDateParam(dateKey);
      }
    },
    [setDateParam],
  );

  // Scroll to selectedDate only when it changes from user intent (calendar click),
  // not when it changes because the IO observer updated the URL while the user was scrolling.
  useEffect(() => {
    if (!selectedDate) return;
    const key = localDateKey(selectedDate);
    // If the IO just reported this date, it's already visible — don't scroll back to it.
    if (key === lastIODateRef.current) return;
    scrollRef.current?.scrollToDate(selectedDate);
  }, [selectedDate]);

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
    <JournalDateScroll
      ref={scrollRef}
      items={allItems}
      onSelect={handleSelect}
      onCreateEntry={onCreateEntry}
      initialDate={selectedDate}
      onVisibleDateChange={handleVisibleDateChange}
      className="flex-1 min-h-0"
    />
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
