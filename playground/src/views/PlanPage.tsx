/**
 * PlanPage — forward-looking journal view.
 *
 * Today sits at the top. Scrolling down moves you forward in time.
 * Every date in the planning window is shown; empty ones show a create-note
 * card so you can pre-plan workouts without leaving the view.
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { localDateKey, type JournalEntrySummary } from './queriable-list/JournalDateScroll';
import { playgroundDB } from '../services/playgroundDB';
import { useJournalQueryState } from '../hooks/useJournalQueryState';
import { createJournalEntryFlow } from '../services/journalEntryFlow';
import { JournalFeed } from './JournalFeed';

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

interface PlanPageProps {
  workoutItems?: { id: string; name: string; category: string; content?: string }[];
}

export function PlanPage({ workoutItems = [] }: PlanPageProps) {
  const { dateParam, setDateParam } = useJournalQueryState();
  const navigate = useNavigate();

  const focusedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());

  // Consume ?sel= seed (set when ctrl+clicking from an entry page)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const sel = searchParams.get('sel');
    if (!sel) return;
    const keys = sel.split(',').filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
    if (keys.length > 0) setMultiSelected(new Set(keys));
    setSearchParams(prev => { prev.delete('sel'); return prev; }, { replace: true });
  }, []); // intentionally once on mount

  // ── Data loading ──────────────────────────────────────────────────────────
  // Plan is forward-looking: we only need journal entries, not past results.

  const [journalEntries, setJournalEntries] = useState<Map<string, JournalEntrySummary>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [lower, upper] = await Promise.all([
          playgroundDB.getPagesByCategory('journal'),
          playgroundDB.getPagesByCategory('Journal'),
        ]);
        if (cancelled) return;
        const map = new Map<string, JournalEntrySummary>();
        [...lower, ...upper].forEach(page => {
          const key = page.id.replace(/^journal\//, '');
          if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
            const headingMatch = page.content.match(/^#\s+(.+)$/m);
            map.set(key, {
              title: headingMatch ? headingMatch[1].trim() : key,
              updatedAt: page.updatedAt,
            });
          }
        });
        setJournalEntries(map);
      } catch {
        setJournalEntries(new Map());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const todayKey = useMemo(() => localDateKey(new Date()), []);

  // ── Planning window ───────────────────────────────────────────────────────
  // today through max(today+14 days, latest future entry + 7 days), capped at today+90

  const dateKeys = useMemo<string[]>(() => {
    if (focusedDate && multiSelected.size === 0) {
      return [focusedDate];
    }

    const today = new Date();
    const cap = addDays(today, 90);

    // Extend window to cover any planned entries that fall beyond the default horizon
    let horizon = addDays(today, 14);
    journalEntries.forEach((_, key) => {
      if (key >= todayKey) {
        const entryDate = new Date(key + 'T00:00:00');
        const withBuffer = addDays(entryDate, 7);
        if (withBuffer > horizon) horizon = withBuffer;
      }
    });
    const endDate = horizon > cap ? cap : horizon;

    const keys: string[] = [];
    let d = new Date(today);
    while (localDateKey(d) <= localDateKey(endDate)) {
      keys.push(localDateKey(d));
      d = addDays(d, 1);
    }
    return keys; // ascending: today first, future below
  }, [focusedDate, multiSelected.size, journalEntries, todayKey]);

  // ── Create-note cards ─────────────────────────────────────────────────────
  // Show create card on every date in the window that has no journal entry.

  const createNoteDates = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    dateKeys.forEach(key => {
      if (!journalEntries.has(key)) set.add(key);
    });
    return set;
  }, [dateKeys, journalEntries]);

  const selectedDateKeys = useMemo<Set<string> | undefined>(() => {
    const combined = new Set<string>([
      ...(focusedDate ? [focusedDate] : []),
      ...multiSelected,
    ]);
    return combined.size > 0 ? combined : undefined;
  }, [focusedDate, multiSelected]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleMultiSelect = useCallback((key: string) => {
    setMultiSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleDateHeaderClick = useCallback((key: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      toggleMultiSelect(key);
    } else {
      setMultiSelected(new Set());
      setDateParam(key);
    }
  }, [toggleMultiSelect, setDateParam]);

  const handleCreateNote = useCallback(async (dateKey: string) => {
    await createJournalEntryFlow({
      dateKey,
      workoutItems,
      onCreated: async (content) => {
        await playgroundDB.savePage({
          id: `journal/${dateKey}`,
          category: 'journal',
          name: dateKey,
          content,
          updatedAt: Date.now(),
        });
        navigate(`/journal/${dateKey}`);
      },
    });
  }, [workoutItems, navigate]);

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
      items={[]}                      // plan view shows no past results
      journalEntries={journalEntries}
      onSelect={() => {}}
      onOpenEntry={handleOpenEntry}
      onCreateNote={handleCreateNote}
      createNoteDates={createNoteDates}
      selectedDateKeys={selectedDateKeys}
      onDateHeaderClick={handleDateHeaderClick}
      showEmptyDates                  // all dates shown — they're planning opportunities
    />
  );
}
