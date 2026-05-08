/**
 * FeedsPage — /feeds
 *
 * Mirrors JournalWeeklyPage: explicit dateKeys array, no infinite scroll.
 * Only shows dates that have feed content.  The caller (this component)
 * decides which dates to show based on loaded data + URL filter state.
 *
 * Filtering:
 *   ?s=YYYY-MM-DD  — focus to a single date
 *   ?feeds=a,b     — show only items from feed IDs a and b
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWodFeeds } from '@/repositories/wod-feeds';
import { playgroundDB } from '../services/playgroundDB';
import { localDateKey } from './queriable-list/JournalDateScroll';
import type { JournalEntrySummary } from './queriable-list/JournalDateScroll';
import { appendWorkoutToJournal } from '../services/journalWorkout';
import { useFeedsQueryState } from '../hooks/useFeedsQueryState';
import { FeedFeed, type FeedItem } from './FeedFeed';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function FeedsPage() {
  const navigate = useNavigate();
  const { dateParam, selectedFeed } = useFeedsQueryState();

  const focusedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;

  // ── Load journal entries for feed dates ───────────────────────────────────

  const [journalEntries, setJournalEntries] = useState<Map<string, JournalEntrySummary>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const allFeeds = useMemo(() => getWodFeeds(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const dateKeys = Array.from(
          new Set(allFeeds.flatMap(f => f.items.map(i => i.feedDate))),
        );
        const entries = await Promise.all(
          dateKeys.map(async key => {
            const page = await playgroundDB.getPage(`journal/${key}`).catch(() => undefined);
            if (!page) return null;
            const headingMatch = page.content.match(/^#\s+(.+)$/m);
            return [key, { title: headingMatch?.[1]?.trim() ?? key, updatedAt: page.updatedAt }] as const;
          }),
        );
        if (cancelled) return;
        const map = new Map<string, JournalEntrySummary>();
        entries.forEach(e => e && map.set(e[0], e[1]));
        setJournalEntries(map);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [allFeeds]);

  // ── Derive feed items filtered by selectedFeed ────────────────────────────

  const filteredItems = useMemo<FeedItem[]>(() => {
    const feeds = selectedFeed
      ? allFeeds.filter(f => f.id === selectedFeed)
      : allFeeds;
    return feeds.flatMap(f =>
      f.items.map(item => ({
        id: `${f.id}/${item.feedDate}/${item.id}`,
        feedId: f.id,
        feedName: f.name,
        feedDate: item.feedDate,
        name: item.name,
        content: item.content,
        path: item.path,
      })),
    );
  }, [allFeeds, selectedFeed]);

  // ── Date keys — only dates with content, sorted newest first ─────────────

  const dateKeys = useMemo(() => {
    if (focusedDate) return [focusedDate];
    const dateSet = new Set<string>(filteredItems.map(i => i.feedDate));
    return Array.from(dateSet).sort().reverse();
  }, [focusedDate, filteredItems]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddToToday = useCallback(async (item: FeedItem) => {
    try {
      const journalNoteId = await appendWorkoutToJournal({
        workoutName: item.name,
        category: item.feedId,
        sourceNoteLabel: item.feedName,
        sourceNotePath: `/feeds/${encodeURIComponent(item.feedId)}`,
        wodContent: item.content,
        wrapInWod: false,
      });
      const dateKey = journalNoteId.replace('journal/', '');
      const today = localDateKey(new Date());
      toast({
        title: 'Added to journal',
        description: dateKey === today ? `Added to today's journal` : `Added to ${dateKey}`,
        action: (
          <ToastAction altText="Open journal" onClick={() => navigate(`/journal/${dateKey}`)}>
            Open
          </ToastAction>
        ),
      });
    } catch {
      toast({ title: 'Error', description: 'Could not add to journal', variant: 'destructive' });
    }
  }, [navigate]);

  const handleSelectItem = useCallback((item: FeedItem) => {
    navigate(`/feeds/${encodeURIComponent(item.feedId)}/${item.feedDate}/${encodeURIComponent(item.id.split('/').pop()!)}`);
  }, [navigate]);

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
    <FeedFeed
      dateKeys={dateKeys}
      items={filteredItems}
      journalEntries={journalEntries}
      onSelectItem={handleSelectItem}
      onOpenEntry={handleOpenEntry}
      onAddToToday={handleAddToToday}
    />
  );
}
