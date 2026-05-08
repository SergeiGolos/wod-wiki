/**
 * FeedDetailPage — /feeds/:feedSlug
 *
 * Single-feed view. Same pattern as FeedsPage / JournalWeeklyPage:
 * explicit dateKeys from feed data only, no infinite scroll, no empty rows.
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWodFeed } from '@/repositories/wod-feeds';
import { playgroundDB } from '../services/playgroundDB';
import { localDateKey } from '../views/queriable-list/JournalDateScroll';
import type { JournalEntrySummary } from '../views/queriable-list/JournalDateScroll';
import { appendWorkoutToJournal } from '../services/journalWorkout';
import { useFeedsQueryState } from '../hooks/useFeedsQueryState';
import { FeedFeed, type FeedItem } from '../views/FeedFeed';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export interface FeedDetailPageProps {
  feedSlug: string;
}

export function FeedDetailPage({ feedSlug }: FeedDetailPageProps) {
  const navigate = useNavigate();
  const { dateParam } = useFeedsQueryState();
  const focusedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null;

  const feed = useMemo(() => getWodFeed(feedSlug), [feedSlug]);

  // ── Load journal entries for this feed's dates ────────────────────────────

  const [journalEntries, setJournalEntries] = useState<Map<string, JournalEntrySummary>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        if (!feed) return;
        const dateKeys = Array.from(new Set(feed.items.map(i => i.feedDate)));
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
  }, [feed]);

  // ── Feed items → FeedItem ─────────────────────────────────────────────────

  const feedItems = useMemo<FeedItem[]>(() => {
    if (!feed) return [];
    return feed.items.map(item => ({
      id: item.id,
      feedId: feed.id,
      feedName: feed.name,
      feedDate: item.feedDate,
      name: item.name,
      content: item.content,
      path: item.path,
    }));
  }, [feed]);

  // ── Date keys — only dates with feed content, sorted newest first ─────────

  const dateKeys = useMemo(() => {
    if (focusedDate) return [focusedDate];
    const dateSet = new Set<string>(feedItems.map(i => i.feedDate));
    return Array.from(dateSet).sort().reverse();
  }, [focusedDate, feedItems]);

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
    navigate(`/feeds/${encodeURIComponent(item.feedId)}/${item.feedDate}/${encodeURIComponent(item.id)}`);
  }, [navigate]);

  const handleOpenEntry = useCallback((key: string) => {
    navigate(`/journal/${key}`);
  }, [navigate]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!feed) {
    return (
      <div className="flex flex-1 items-center justify-center p-20 text-sm text-muted-foreground">
        Feed not found: {feedSlug}
      </div>
    );
  }

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
      items={feedItems}
      journalEntries={journalEntries}
      onSelectItem={handleSelectItem}
      onOpenEntry={handleOpenEntry}
      onAddToToday={handleAddToToday}
    />
  );
}
