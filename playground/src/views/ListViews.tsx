import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localDateKey, type JournalEntrySummary } from './queriable-list/JournalDateScroll';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { playgroundDB } from '../services/playgroundDB';
import { useJournalQueryState } from '../hooks/useJournalQueryState';
import { useCommandPalette } from '@/components/command-palette/CommandContext';
import { createJournalNoteStrategy, JOURNAL_BLANK_TEMPLATE } from '../services/journalNoteStrategy';
import type { FilteredListItem } from './queriable-list/types';
import { JournalFeed } from './JournalFeed';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface JournalWeeklyPageProps {
  onSelect: (item: any) => void;
  onCreateEntry?: (date: Date) => void;
  /** Workout library items forwarded from App — used by the Collection source in the create palette. */
  workoutItems?: { id: string; name: string; category: string; content?: string }[];
}

export function JournalWeeklyPage({ onSelect, onCreateEntry, workoutItems = [] }: JournalWeeklyPageProps) {
  const { dateParam, setDateParam } = useJournalQueryState();
  const navigate = useNavigate();
  const { setIsOpen: setIsCommandPaletteOpen, setStrategy } = useCommandPalette();

  // ── Focused date (URL-driven, single date, set by plain click or nav panel) ──
  // Only one date at a time; filters the feed to show just that date.
  const focusedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;

  // ── Multi-select (local state, set by ctrl+click) ─────────────────────────
  // Never collapses the feed — all dates stay visible, selected ones are highlighted.
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());

  const toggleMultiSelect = useCallback((key: string) => {
    setMultiSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

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

  const todayKey = useMemo(() => localDateKey(new Date()), []);

  const dateKeys = useMemo(() => {
    if (focusedDate && multiSelected.size === 0) {
      // Focused view: a single plain-clicked date, no multi-select active
      return [focusedDate];
    }
    // Feed: today always at top, plus every date that has records
    const dateSet = new Set<string>();
    dateSet.add(todayKey);
    journalEntries.forEach((_, key) => dateSet.add(key));
    listItems.forEach(item => {
      if (item.date) dateSet.add(localDateKey(new Date(item.date)));
    });
    return Array.from(dateSet).sort().reverse();
  }, [focusedDate, multiSelected.size, journalEntries, listItems, todayKey]);

  // ── Which dates show the create-note card ─────────────────────────────────
  //   Focused mode  → the focused date if it has no note
  //   Feed / multi   → today only (if today has no note)

  const createNoteDates = useMemo<Set<string>>(() => {
    if (focusedDate && multiSelected.size === 0) {
      return journalEntries.has(focusedDate) ? new Set() : new Set([focusedDate]);
    }
    return journalEntries.has(todayKey) ? new Set() : new Set([todayKey]);
  }, [focusedDate, multiSelected.size, journalEntries, todayKey]);

  // Dates that get a selection highlight ring
  const selectedDateKeys = useMemo<Set<string> | undefined>(() => {
    const combined = new Set<string>([
      ...(focusedDate ? [focusedDate] : []),
      ...multiSelected,
    ]);
    return combined.size > 0 ? combined : undefined;
  }, [focusedDate, multiSelected]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDateHeaderClick = useCallback((key: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      // Ctrl/Cmd+click: toggle in local multi-select.
      // The feed stays fully visible — other dates are never hidden.
      toggleMultiSelect(key);
    } else {
      // Plain click: focus this date (filtered view) and clear any multi-select.
      setMultiSelected(new Set());
      setDateParam(key);
    }
  }, [toggleMultiSelect, setDateParam]);

  const handleCreateNote = useCallback((dateKey: string) => {
    const strategy = createJournalNoteStrategy({
      dateKey,
      workoutItems,
      updateStrategy: setStrategy,
      onCreated: async (content: string) => {
        const noteContent = content || JOURNAL_BLANK_TEMPLATE;
        await playgroundDB.savePage({
          id: `journal/${dateKey}`,
          category: 'journal',
          name: dateKey,
          content: noteContent,
          updatedAt: Date.now(),
        });
        setIsCommandPaletteOpen(false);
        navigate(`/journal/${dateKey}`);
      },
    });
    setStrategy(strategy);
    setIsCommandPaletteOpen(true);
  }, [workoutItems, setStrategy, setIsCommandPaletteOpen, navigate]);

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
      onCreateNote={handleCreateNote}
      createNoteDates={createNoteDates}
      selectedDateKeys={selectedDateKeys}
      onDateHeaderClick={handleDateHeaderClick}
      showEmptyDates={Boolean(focusedDate) && multiSelected.size === 0}
    />
  );
}
