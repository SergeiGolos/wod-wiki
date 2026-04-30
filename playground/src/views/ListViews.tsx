import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { JournalDateScroll, localDateKey, type JournalDateScrollHandle, type JournalEntrySummary } from './queriable-list/JournalDateScroll';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { playgroundDB } from '../services/playgroundDB';
import { useJournalQueryState } from '../hooks/useJournalQueryState';
import type { FilteredListItem } from './queriable-list/types';

interface BaseProps {
  workoutItems?: { id: string; name: string; category: string; content?: string }[];
  onSelect: (item: any) => void;
}

interface JournalWeeklyPageProps extends BaseProps {
  onCreateEntry?: (date: Date) => void;
}

export function JournalWeeklyPage({ onSelect, onCreateEntry }: JournalWeeklyPageProps) {
  const { selectedDate, setDateParam, selectedTags } = useJournalQueryState();
  const [results, setResults] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<Map<string, JournalEntrySummary>>(new Map());
  const scrollRef = useRef<JournalDateScrollHandle>(null);

  // Seed with today — the journal page always opens at today regardless of ?s= param.
  // User-intent scrolls (calendar clicks) are handled by the effect below.
  const lastIODateRef = useRef<string>(localDateKey(new Date()));

  // Skip scroll on the initial render — don't chase the ?s= URL param on page load.
  // User clicks on the calendar after mount will be caught by the effect below.
  const hasMountedRef = useRef(false);

  useEffect(() => {
    indexedDBService.getRecentResults(100).then(setResults);
  }, []);

  // Load journal entries (notes written for specific dates)
  useEffect(() => {
    // Fetch both casings to handle legacy data saved with category: 'Journal'
    Promise.all([
      playgroundDB.getPagesByCategory('journal'),
      playgroundDB.getPagesByCategory('Journal'),
    ]).then(([lower, upper]) => {
      const pages = [...lower, ...upper];
      const map = new Map<string, JournalEntrySummary>();
      pages.forEach(page => {
        // id is 'journal/yyyy-mm-dd' → extract the date key
        const dateKey = page.id.replace(/^journal\//, '');
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          // Extract first # heading from content, or use the date key as title
          const headingMatch = page.content.match(/^#\s+(.+)$/m);
          map.set(dateKey, {
            title: headingMatch ? headingMatch[1].trim() : dateKey,
            updatedAt: page.updatedAt,
          });
        }
      });
      setJournalEntries(map);
    });
  }, []);

  const navigate = useNavigate();
  const handleSelect = (item: FilteredListItem) => {
    if (item.type === 'result') {
      navigate(`/review/${item.id}`);
    } else {
      onSelect(item.payload);
    }
  };

  const handleOpenEntry = useCallback((dateKey: string) => {
    navigate(`/journal/${dateKey}`);
  }, [navigate]);

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
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!selectedDate) return;
    const key = localDateKey(selectedDate);
    // If the IO just reported this date, it's already visible — don't scroll back to it.
    if (key === lastIODateRef.current) return;
    scrollRef.current?.scrollToDate(selectedDate);
  }, [selectedDate]);

  // UUID pattern — bare UUIDs are legacy playground noteIds saved before the prefix fix
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const allItems = useMemo(() => {
    // Only show workout results — journal notes are handled via the journalEntries map
    const combined: FilteredListItem[] = results.map(r => {
      const isPlayground = r.noteId.startsWith('playground/') || UUID_RE.test(r.noteId)

      // noteId is like 'collections/geoff-neupert/fran' or 'journal/2024-01-01'
      // Use the last path segment as the workout name, but clean up date-only entries
      const parts = r.noteId.split('/');
      const lastSegment = parts[parts.length - 1] || r.noteId;
      const isDateSegment = /^\d{4}-\d{2}-\d{2}$/.test(lastSegment);
      const title = isPlayground
        ? 'Playground'
        : isDateSegment
          ? (parts[parts.length - 2] || lastSegment)
          : lastSegment;
      return {
        id: r.id,
        type: 'result' as const,
        title,
        subtitle: r.data?.completed ? 'Completed' : 'Partial',
        date: r.completedAt,
        group: isPlayground ? 'playground' : undefined,
        payload: r,
      };
    });

    if (selectedTags.length === 0) return combined.sort((a, b) => (b.date || 0) - (a.date || 0));

    return combined
      .filter(item => {
        const title = item.title.toLowerCase();
        return selectedTags.some(tag => title.includes(tag.toLowerCase()));
      })
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [results, selectedTags]);

  return (
    <JournalDateScroll
      ref={scrollRef}
      items={allItems}
      onSelect={handleSelect}
      onVisibleDateChange={handleVisibleDateChange}
      journalEntries={journalEntries}
      onOpenEntry={handleOpenEntry}
      onCreateEntry={onCreateEntry}
      className="flex-1 min-h-0"
    />
  );
}
