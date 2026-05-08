/**
 * FeedsPage — /feeds
 *
 * Browse all available workout feeds (date-organised programming content).
 * Uses CollectionListTemplate for consistent list layout + keyboard nav.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RssIcon, ChevronRightIcon } from 'lucide-react';
import { getWodFeeds, type WodFeed } from '@/repositories/wod-feeds';
import { CollectionListTemplate } from '../templates/CollectionListTemplate';
import { findCanvasPage } from '../canvas/canvasRoutes';
import { ListPreludeCanvas } from '../templates/ListPreludeCanvas';

// ── Row renderer ───────────────────────────────────────────────────────────

function FeedRow({ feed }: { feed: WodFeed }) {
  const hasCategories = feed.categories.length > 0;
  const dateCount = new Set(feed.items.map(i => i.feedDate)).size;
  const mostRecent = feed.items[0]?.feedDate;

  return (
    <div className="w-full flex items-center gap-4 px-6 py-4 text-left group">
      <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
        <RssIcon className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
          {feed.name}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <p className="text-xs text-muted-foreground font-medium">
            {feed.items.length} workout{feed.items.length !== 1 ? 's' : ''} · {dateCount} session{dateCount !== 1 ? 's' : ''}
          </p>
          {mostRecent && (
            <p className="text-xs text-muted-foreground/60">
              Latest: {new Date(mostRecent + 'T00:00:00').toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          )}
          {hasCategories
            ? feed.categories.map(cat => (
              <span
                key={cat}
                className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
              >
                {cat.replace(/-/g, ' ')}
              </span>
            ))
            : (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                General
              </span>
            )}
        </div>
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ── Query types ────────────────────────────────────────────────────────────

interface FeedsQuery {
  text: string;
}

// ── Page component ─────────────────────────────────────────────────────────

export function FeedsPage() {
  const navigate = useNavigate();
  const prependedCanvasPage = useMemo(() => findCanvasPage('/feeds'), []);

  const query = useMemo<FeedsQuery>(() => ({ text: '' }), []);

  const loadFeeds = useMemo(
    () => (_q: FeedsQuery) => {
      return getWodFeeds();
    },
    [],
  );

  return (
    <CollectionListTemplate
      query={query}
      loadRecords={loadFeeds}
      mapRecordToItem={feed => feed}
      getItemKey={feed => feed.id}
      prependedCanvas={prependedCanvasPage ? <ListPreludeCanvas page={prependedCanvasPage} /> : undefined}
      renderPrimaryContent={feed => <FeedRow feed={feed} />}
      getItemActions={feed => [
        {
          id: 'open',
          label: 'Open',
          onSelect: item => navigate(`/feeds/${encodeURIComponent(item.id)}`),
        },
      ]}
    />
  );
}
