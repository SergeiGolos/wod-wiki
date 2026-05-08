/**
 * FeedsNavPanel — L2 context panel for feed browsing.
 *
 * Route modes:
 *   /feeds                         → list of all feeds
 *   /feeds/:slug                   → this feed's date groups
 *   /feeds/:slug/:date/:item       → parent feed + sibling items for that date
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { NavPanelProps } from '../navTypes';
import { getWodFeed, getWodFeeds, getFeedDateKeys } from '@/repositories/wod-feeds';

export function FeedsNavPanel(_props: NavPanelProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse route
  const feedDetailMatch = location.pathname.match(/^\/feeds\/([^/]+)$/);
  const feedItemMatch = location.pathname.match(/^\/feeds\/([^/]+)\/(\d{4}-\d{2}-\d{2})\/([^/]+)$/);

  const feedSlug = feedDetailMatch
    ? decodeURIComponent(feedDetailMatch[1])
    : feedItemMatch
      ? decodeURIComponent(feedItemMatch[1])
      : null;

  const feedDate = feedItemMatch ? feedItemMatch[2] : null;
  const feedItemId = feedItemMatch ? decodeURIComponent(feedItemMatch[3]) : null;

  const isListPage = location.pathname === '/feeds';
  const feed = feedSlug ? getWodFeed(feedSlug) : null;

  // ── Feed list page ─────────────────────────────────────────────────────

  if (isListPage) {
    const feeds = getWodFeeds();
    return (
      <div className="flex flex-col gap-2 px-2 py-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Feeds
        </div>
        <div className="flex flex-col gap-1">
          {feeds.map(f => (
            <button
              key={f.id}
              onClick={() => navigate(`/feeds/${encodeURIComponent(f.id)}`)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <span className="size-2 rounded-full shrink-0 bg-border" />
              {f.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Feed detail / item page ────────────────────────────────────────────

  if (feed) {
    const dateKeys = getFeedDateKeys(feed);

    // When on a specific item, show siblings for that date
    if (feedDate && feedItemId) {
      const siblings = feed.items.filter(i => i.feedDate === feedDate);
      return (
        <div className="flex flex-col gap-2 px-2 py-3">
          <button
            onClick={() => navigate(`/feeds/${encodeURIComponent(feed.id)}`)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-left text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
          >
            <span className="size-2 rounded-full shrink-0 bg-primary" />
            {feed.name}
          </button>

          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 pt-2">
            {new Date(feedDate + 'T00:00:00').toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </div>

          <div className="flex flex-col gap-1">
            {siblings.map(item => {
              const isActive = item.id === feedItemId;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/feeds/${encodeURIComponent(feed.id)}/${feedDate}/${encodeURIComponent(item.id)}`)}
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
        </div>
      );
    }

    // Feed detail page — show date groups
    return (
      <div className="flex flex-col gap-2 px-2 py-3">
        <button
          onClick={() => navigate('/feeds')}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-left text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
        >
          <span className="size-2 rounded-full shrink-0 bg-primary" />
          {feed.name}
        </button>

        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 pt-1">
          Sessions
        </div>

        <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {dateKeys.map(dateKey => {
            const count = feed.items.filter(i => i.feedDate === dateKey).length;
            return (
              <button
                key={dateKey}
                onClick={() => {
                  navigate(`/feeds/${encodeURIComponent(feed.id)}`, {
                    state: { scrollTo: dateKey },
                  });
                }}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full shrink-0 bg-border" />
                  {new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric',
                  })}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground/50">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
