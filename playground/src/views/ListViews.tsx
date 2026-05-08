import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localDateKey, type JournalEntrySummary } from './queriable-list/JournalDateScroll';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { playgroundDB } from '../services/playgroundDB';
import { useJournalQueryState } from '../hooks/useJournalQueryState';
import type { FilteredListItem } from './queriable-list/types';
import { JournalFeed } from './JournalFeed';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface JournalWeeklyPageProps {
  onSelect: (item: any) => void;
  onCreateEntry?: (date: Date) => void;
}

export function JournalWeeklyPage({ onSelect, onCreateEntry }: JournalWeeklyPageProps) {
  const { dateParam } = useJournalQueryState();
  const navigate = useNavigate();

  // ── Data loading ──────────────────────────────────────────────────────────

  const [results, setResults] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<Map<string, JournalEntrySummary>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const [rawResults, lowerPages, upperPages] = await Promise.all([
          indexedDBService.getRecentResults(100),
          playgroundDB.getPagesByCategory('journal'),
          playgroundDB.getPagesByCategory('Journal'),
        ]);

        if (cancelled) return;

        // Build journal entries map
        const entryMap = new Map<string, JournalEntrySummary>();
        [...lowerPages, ...upperPages].forEach(page => {
          const dateKey = page.id.replace(/^journal\//, '');
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
            const headingMatch = page.content.match(/^#\s+(.+)$/m);
            entryMap.set(dateKey, {
              title: headingMatch ? headingMatch[1].trim() : dateKey,
              updatedAt: page.updatedAt,
            });
          }
        });

        setResults(rawResults);
        setJournalEntries(entryMap);
      } catch {
        setResults([]);
        setJournalEntries(new Map());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Map results → list items ──────────────────────────────────────────────

  const listItems = useMemo<FilteredListItem[]>(() =>
    results.map(r => {
      const safeNoteId = r.noteId || '';
      const isPlayground = safeNoteId.startsWith('playground/') || UUID_RE.test(safeNoteId);
      const parts = safeNoteId.split('/');
      const lastSegment = parts[parts.length - 1] || safeNoteId;
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
    }),
  [results]);

  // ── Date keys to display ──────────────────────────────────────────────────

  const dateKeys = useMemo(() => {
    if (dateParam) {
      // Single-date filter mode: show only the selected date
      return [dateParam];
    }

    // Feed mode: all dates that have at least one journal entry or result, newest first
    const dateSet = new Set<string>();
    journalEntries.forEach((_, key) => dateSet.add(key));
    listItems.forEach(item => {
      if (item.date) dateSet.add(localDateKey(new Date(item.date)));
    });
    return Array.from(dateSet).sort().reverse();
  }, [dateParam, journalEntries, listItems]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelect = useCallback((item: FilteredListItem) => {
    if (item.type === 'result') {
      navigate(`/review/${item.id}`);
    } else {
      onSelect(item.payload);
    }
  }, [navigate, onSelect]);

  const handleOpenEntry = useCallback((key: string) => {
    navigate(`/journal/${key}`);
  }, [navigate]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-20 text-sm font-medium text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <JournalFeed
      dateKeys={dateKeys}
      items={listItems}
      journalEntries={journalEntries}
      onSelect={handleSelect}
      onOpenEntry={handleOpenEntry}
      onCreateEntry={onCreateEntry}
      // In single-date filter mode, show the "No activity" placeholder so the
      // user can see the date even if nothing has been logged yet.
      showEmptyDates={Boolean(dateParam)}
    />
  );
}
