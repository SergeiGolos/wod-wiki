/**
 * FeedsPage — /feeds
 *
 * Calendar view of all workout feeds, date-grouped.
 * Mirrors the journal list but the source data is the build-time feeds
 * directory instead of user-authored notes.
 *
 * Filtering:
 *   ?s=YYYY-MM-DD  — scroll/focus to a specific date
 *   ?feeds=a,b     — show only items from feed IDs a and b
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DumbbellIcon, ChevronRightIcon, PlusIcon } from 'lucide-react';
import { getWodFeeds, type WodFeedItem } from '@/repositories/wod-feeds';
import { playgroundDB } from '../services/playgroundDB';
import { localDateKey } from './queriable-list/JournalDateScroll';
import type { JournalEntrySummary } from './queriable-list/JournalDateScroll';
import type { FilteredListItem } from './queriable-list/types';
import { CalendarListTemplate } from '../templates/CalendarListTemplate';
import { appendWorkoutToJournal } from '../services/journalWorkout';
import { useFeedsQueryState } from '../hooks/useFeedsQueryState';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

// ── Types ──────────────────────────────────────────────────────────────────

type FeedItemWithMeta = WodFeedItem & { feedId: string; feedName: string };

// ── Row renderer ───────────────────────────────────────────────────────────

function FeedItemRow({
  item,
  feedName,
  onAddToToday,
}: {
  item: FeedItemWithMeta;
  feedName: string;
  onAddToToday: (item: FeedItemWithMeta) => void;
}) {
  return (
    <div className="w-full flex items-center gap-4 px-6 py-3.5 text-left group">
      <div className="flex-shrink-0 size-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
        <DumbbellIcon className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{feedName}</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onAddToToday(item); }}
        title="Add to today's journal"
        className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
      >
        <PlusIcon className="size-3" />
        Today
      </button>
      <ChevronRightIcon className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
    </div>
  );
}

// ── Query ──────────────────────────────────────────────────────────────────

interface FeedsQuery {
  selectedFeeds: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

// ── Page component ─────────────────────────────────────────────────────────

export function FeedsPage() {
  const navigate = useNavigate();
  const { selectedDate, selectedFeeds } = useFeedsQueryState();

  const allFeeds = useMemo(() => getWodFeeds(), []);

  // Most recent date across all feeds as scroll anchor
  const initialDate = useMemo(() => {
    const dates = allFeeds.flatMap(f => f.items.map(i => i.feedDate)).sort().reverse();
    return dates[0] ? new Date(dates[0] + 'T00:00:00') : undefined;
  }, [allFeeds]);

  const query = useMemo<FeedsQuery>(() => ({ selectedFeeds }), [selectedFeeds]);

  // Load feed items — respects feed filter
  const loadResults = useCallback((q: FeedsQuery): FeedItemWithMeta[] => {
    const feeds = q.selectedFeeds.length > 0
      ? allFeeds.filter(f => q.selectedFeeds.includes(f.id))
      : allFeeds;
    return feeds.flatMap(f =>
      f.items.map(item => ({ ...item, feedId: f.id, feedName: f.name })),
    );
  }, [allFeeds]);

  // Load journal entries for feed dates
  const loadJournalEntries = useCallback(async (q: FeedsQuery): Promise<Map<string, JournalEntrySummary>> => {
    const feeds = q.selectedFeeds.length > 0
      ? allFeeds.filter(f => q.selectedFeeds.includes(f.id))
      : allFeeds;
    const dateKeys = Array.from(new Set(feeds.flatMap(f => f.items.map(i => i.feedDate))));

    const entryMap = new Map<string, JournalEntrySummary>();
    await Promise.all(
      dateKeys.map(async dateKey => {
        const page = await playgroundDB.getPage(`journal/${dateKey}`).catch(() => undefined);
        if (page) {
          const headingMatch = page.content.match(/^#\s+(.+)$/m);
          entryMap.set(dateKey, {
            title: headingMatch ? headingMatch[1].trim() : dateKey,
            updatedAt: page.updatedAt,
          });
        }
      }),
    );
    return entryMap;
  }, [allFeeds]);

  const mapResultsToItems = useCallback(
    (items: FeedItemWithMeta[]): FilteredListItem[] =>
      items.map(item => ({
        id: `${item.feedId}/${item.feedDate}/${item.id}`,
        type: 'block' as const,
        title: item.name,
        subtitle: item.feedName,
        date: new Date(item.feedDate + 'T00:00:00').getTime(),
        payload: item,
      })),
    [],
  );

  const handleAddToToday = useCallback(async (item: FeedItemWithMeta) => {
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

  const renderResultRow = useCallback(
    (listItem: FilteredListItem, onSelect: (item: FilteredListItem) => void) => {
      const item = listItem.payload as FeedItemWithMeta;
      return (
        <div key={listItem.id} onClick={() => onSelect(listItem)} className="cursor-pointer">
          <FeedItemRow
            item={item}
            feedName={item.feedName}
            onAddToToday={handleAddToToday}
          />
        </div>
      );
    },
    [handleAddToToday],
  );

  const handleSelectItem = useCallback((item: FilteredListItem) => {
    const feedItem = item.payload as FeedItemWithMeta;
    navigate(
      `/feeds/${encodeURIComponent(feedItem.feedId)}/${feedItem.feedDate}/${encodeURIComponent(feedItem.id)}`,
    );
  }, [navigate]);

  const handleOpenEntry = useCallback((dateKey: string) => {
    navigate(`/journal/${dateKey}`);
  }, [navigate]);

  return (
    <CalendarListTemplate
      query={query}
      loadResults={loadResults}
      loadJournalEntries={loadJournalEntries}
      mapResultsToItems={mapResultsToItems}
      initialDate={selectedDate ?? initialDate}
      renderResultRow={renderResultRow}
      onSelectItem={handleSelectItem}
      onOpenEntry={handleOpenEntry}
    />
  );
}
