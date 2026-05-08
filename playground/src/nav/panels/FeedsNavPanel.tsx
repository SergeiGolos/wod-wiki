/**
 * FeedsNavPanel — L2 context panel for feed browsing.
 *
 * Mirrors JournalNavPanel:
 *   - Mini CalendarCard with feed-content dates highlighted
 *   - Feed name chips for filtering (replaces tag chips)
 *   - Active date badge with clear button
 *
 * Route modes:
 *   /feeds                         → calendar + all feed chips
 *   /feeds/:slug                   → calendar (this feed's dates) + back link + sibling items
 *   /feeds/:slug/:date/:item       → calendar + sibling items for that date
 */

import { useMatch, useNavigate } from 'react-router-dom';
import { CalendarCard } from '@/components/ui/CalendarCard';
import { cn } from '@/lib/utils';
import { useFeedsQueryState } from '../../hooks/useFeedsQueryState';
import { getWodFeeds, getWodFeed, getFeedDateKeys } from '@/repositories/wod-feeds';
import type { NavPanelProps } from '../navTypes';
import { useMemo } from 'react';

export function FeedsNavPanel(_props: NavPanelProps) {
  const navigate = useNavigate();

  // Route matching
  const listMatch = useMatch('/feeds');
  const detailMatch = useMatch('/feeds/:feedSlug');
  const itemMatch = useMatch('/feeds/:feedSlug/:feedDate/:feedItem');

  const isListPage = Boolean(listMatch);
  const feedSlug = detailMatch?.params.feedSlug ?? itemMatch?.params.feedSlug ?? null;
  const feedDate = itemMatch?.params.feedDate ?? null;
  const feedItemId = itemMatch?.params.feedItem ?? null;
  const feed = feedSlug ? getWodFeed(feedSlug) : null;

  const { dateParam, selectedDate, setSelectedDate, selectedFeed, selectFeed, clearFeed } =
    useFeedsQueryState();

  const allFeeds = useMemo(() => getWodFeeds(), []);

  // Build the set of dates that have content (for CalendarCard dots)
  const entryDates = useMemo<Set<string>>(() => {
    if (feed) {
      return new Set(feed.items.map(i => i.feedDate));
    }
    const feeds = selectedFeed
      ? allFeeds.filter(f => f.id === selectedFeed)
      : allFeeds;
    return new Set(feeds.flatMap(f => f.items.map(i => i.feedDate)));
  }, [allFeeds, feed, selectedFeed]);

  const handleDateSelect = (date: Date) => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    if (isListPage || feed) {
      // Toggle: click same date → clear filter, same as JournalNavPanel
      if (iso === dateParam) {
        setSelectedDate(null);
      } else {
        setSelectedDate(date);
      }
    }
  };

  // ── Feed item detail: show siblings for the active date ────────────────

  if (feedDate && feedItemId && feed) {
    const siblings = feed.items.filter(i => i.feedDate === feedDate);
    const dateKeys = getFeedDateKeys(feed);

    return (
      <div className="flex flex-col gap-3 px-1 py-2">
        <CalendarCard
          selectedDate={new Date(feedDate + 'T00:00:00')}
          onDateSelect={handleDateSelect}
          entryDates={entryDates}
          className="scale-95 origin-top-left"
        />

        {/* Back to feed */}
        <div className="flex flex-col gap-1 px-2">
          <button
            onClick={() => navigate(`/feeds/${encodeURIComponent(feed.id)}`)}
            className="text-xs font-semibold text-primary hover:underline text-left"
          >
            ← {feed.name}
          </button>
        </div>

        {/* Date label + siblings */}
        <div className="flex flex-col gap-1 px-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">
            {new Date(feedDate + 'T00:00:00').toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </div>
          {siblings.map(item => {
            const isActive = item.id === feedItemId;
            return (
              <button
                key={item.id}
                onClick={() =>
                  navigate(`/feeds/${encodeURIComponent(feed.id)}/${feedDate}/${encodeURIComponent(item.id)}`)
                }
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className={cn('size-2 rounded-full shrink-0', isActive ? 'bg-primary' : 'bg-border')} />
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Other sessions */}
        <div className="flex flex-col gap-1 px-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">
            All sessions
          </div>
          <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
            {dateKeys.map(dk => (
              <button
                key={dk}
                onClick={() => {
                  const first = feed.items.find(i => i.feedDate === dk);
                  if (first) navigate(`/feeds/${encodeURIComponent(feed.id)}/${dk}/${encodeURIComponent(first.id)}`);
                }}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-left transition-colors',
                  dk === feedDate
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {new Date(dk + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                <span className="text-[10px] font-bold text-muted-foreground/50">
                  {feed.items.filter(i => i.feedDate === dk).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Feed detail page ───────────────────────────────────────────────────

  if (feed) {
    const dateKeys = getFeedDateKeys(feed);
    return (
      <div className="flex flex-col gap-3 px-1 py-2">
        <CalendarCard
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          entryDates={entryDates}
          className="scale-95 origin-top-left"
        />

        <div className="flex flex-col gap-1 px-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Sessions
            </div>
            <button
              onClick={() => navigate('/feeds')}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              All feeds
            </button>
          </div>
          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
            {dateKeys.map(dk => {
              const count = feed.items.filter(i => i.feedDate === dk).length;
              return (
                <button
                  key={dk}
                  onClick={() => {
                    const first = feed.items.find(i => i.feedDate === dk);
                    if (first) navigate(`/feeds/${encodeURIComponent(feed.id)}/${dk}/${encodeURIComponent(first.id)}`);
                  }}
                  className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full shrink-0 bg-border" />
                    {new Date(dk + 'T00:00:00').toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/50">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Feeds list page ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 px-1 py-2">
      {/* Active date filter badge */}
      {dateParam && (
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground">Filtered to</span>
          <button
            onClick={() => setSelectedDate(null)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {dateParam} ×
          </button>
        </div>
      )}

      {/* Mini calendar — dots on feed publication dates */}
      <CalendarCard
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        entryDates={entryDates}
        className="scale-95 origin-top-left"
      />

      {/* Feed name chips — single-select radio style */}
      <div className="flex flex-col gap-1 px-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Feeds
          </div>
          {selectedFeed && (
            <button
              onClick={() => clearFeed()}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {allFeeds.map(f => {
            const isActive = selectedFeed === f.id;
            return (
              <button
                key={f.id}
                onClick={() => selectFeed(f.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {/* Radio indicator */}
                <span className={cn(
                  'size-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  isActive ? 'border-primary' : 'border-muted-foreground/40',
                )}>
                  {isActive && <span className="size-1.5 rounded-full bg-primary" />}
                </span>
                {f.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
