/**
 * FeedDetailPage — /feeds/:feedSlug
 *
 * Shows all workouts in a feed grouped by their publication date,
 * using CalendarListTemplate so the UX is consistent with the Journal.
 *
 * Journal notes that happen to fall on feed dates are surfaced as note
 * cards above the feed items, giving the user an at-a-glance view of
 * "what was published" vs "what I actually did".
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DumbbellIcon, ChevronRightIcon, PlusIcon, CalendarDaysIcon } from 'lucide-react';
import { getWodFeed, getFeedDateKeys, type WodFeedItem } from '@/repositories/wod-feeds';
import { playgroundDB } from '../services/playgroundDB';
import { localDateKey } from '../views/queriable-list/JournalDateScroll';
import type { JournalEntrySummary } from '../views/queriable-list/JournalDateScroll';
import type { FilteredListItem } from '../views/queriable-list/types';
import { CalendarListTemplate } from '../templates/CalendarListTemplate';
import { appendWorkoutToJournal } from '../services/journalWorkout';
import { useFeedsQueryState } from '../hooks/useFeedsQueryState';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

// ── Row renderer ───────────────────────────────────────────────────────────

interface FeedItemRowProps {
  item: WodFeedItem;
  onAddToToday: (item: WodFeedItem) => void;
  onPlanForDate: (item: WodFeedItem) => void;
}

function FeedItemRow({ item, onAddToToday, onPlanForDate }: FeedItemRowProps) {
  return (
    <div className="w-full flex items-center gap-4 px-6 py-3.5 text-left group">
      <div className="flex-shrink-0 size-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
        <DumbbellIcon className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Feed workout</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onAddToToday(item); }}
          title="Add to today's journal"
          className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
        >
          <PlusIcon className="size-3" />
          Today
        </button>
        <button
          onClick={e => { e.stopPropagation(); onPlanForDate(item); }}
          title="Plan for a specific date"
          className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
        >
          <CalendarDaysIcon className="size-3" />
          Plan
        </button>
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

interface FeedDetailQuery {
  feedSlug: string;
}

export interface FeedDetailPageProps {
  feedSlug: string;
}

// ── Page component ─────────────────────────────────────────────────────────

export function FeedDetailPage({ feedSlug }: FeedDetailPageProps) {
  const navigate = useNavigate();
  const feed = useMemo(() => getWodFeed(feedSlug), [feedSlug]);
  const { selectedDate } = useFeedsQueryState();

  // Most recent feed date as the initial scroll anchor (overridden by URL date param)
  const initialDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    const dateKeys = getFeedDateKeys(feed ?? { id: '', name: '', categories: [], items: [] });
    return dateKeys.length > 0 ? new Date(dateKeys[0] + 'T00:00:00') : undefined;
  }, [feed, selectedDate]);

  const query = useMemo<FeedDetailQuery>(() => ({ feedSlug }), [feedSlug]);

  // Load feed items as FilteredListItems
  const loadResults = useCallback((_q: FeedDetailQuery): WodFeedItem[] => {
    return getWodFeed(_q.feedSlug)?.items ?? [];
  }, []);

  // Load journal entries for dates that appear in this feed
  const loadJournalEntries = useCallback(async (_q: FeedDetailQuery): Promise<Map<string, JournalEntrySummary>> => {
    const theFeed = getWodFeed(_q.feedSlug);
    if (!theFeed) return new Map();

    const dateKeys = getFeedDateKeys(theFeed);
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
  }, []);

  const mapResultsToItems = useCallback(
    (items: WodFeedItem[]): FilteredListItem[] =>
      items.map(item => ({
        id: `${item.feedDate}/${item.id}`,
        type: 'block' as const,
        title: item.name,
        subtitle: item.feedDate,
        date: new Date(item.feedDate + 'T00:00:00').getTime(),
        payload: item,
      })),
    [],
  );

  const handleAddToToday = useCallback(async (item: WodFeedItem) => {
    try {
      const journalNoteId = await appendWorkoutToJournal({
        workoutName: item.name,
        category: feedSlug,
        sourceNoteLabel: feed?.name,
        sourceNotePath: `/feeds/${encodeURIComponent(feedSlug)}`,
        wodContent: item.content,
        wrapInWod: false,
      });
      const dateKey = journalNoteId.replace('journal/', '');
      const today = localDateKey(new Date());
      toast({
        title: 'Added to journal',
        description: dateKey === today
          ? `"${item.name}" added to today's journal`
          : `"${item.name}" added to ${dateKey}`,
        action: (
          <ToastAction altText="Open journal" onClick={() => navigate(`/journal/${dateKey}`)}>
            Open
          </ToastAction>
        ),
      });
    } catch {
      toast({ title: 'Error', description: 'Could not add workout to journal', variant: 'destructive' });
    }
  }, [feed, feedSlug, navigate]);

  // For now, Plan for date uses today (calendar picker is a future enhancement)
  const handlePlanForDate = useCallback(async (item: WodFeedItem) => {
    // Re-use same flow as Add to Today — a date-picker UI will be wired in Step 2
    handleAddToToday(item);
  }, [handleAddToToday]);

  const renderResultRow = useCallback(
    (listItem: FilteredListItem, onSelect: (item: FilteredListItem) => void) => {
      const feedItem = listItem.payload as WodFeedItem;
      return (
        <div
          key={listItem.id}
          onClick={() => onSelect(listItem)}
          className="cursor-pointer"
        >
          <FeedItemRow
            item={feedItem}
            onAddToToday={handleAddToToday}
            onPlanForDate={handlePlanForDate}
          />
        </div>
      );
    },
    [feedSlug, handleAddToToday, handlePlanForDate],
  );

  const handleSelectItem = useCallback((item: FilteredListItem) => {
    const feedItem = item.payload as WodFeedItem;
    navigate(`/feeds/${encodeURIComponent(feedSlug)}/${feedItem.feedDate}/${encodeURIComponent(feedItem.id)}`);
  }, [feedSlug, navigate]);

  const handleOpenEntry = useCallback((dateKey: string) => {
    navigate(`/journal/${dateKey}`);
  }, [navigate]);

  if (!feed) {
    return (
      <div className="flex flex-1 items-center justify-center p-20 text-sm text-muted-foreground">
        Feed not found: {feedSlug}
      </div>
    );
  }

  return (
    <CalendarListTemplate
      query={query}
      loadResults={loadResults}
      loadJournalEntries={loadJournalEntries}
      mapResultsToItems={mapResultsToItems}
      initialDate={initialDate}
      renderResultRow={renderResultRow}
      onSelectItem={handleSelectItem}
      onOpenEntry={handleOpenEntry}
    />
  );
}
