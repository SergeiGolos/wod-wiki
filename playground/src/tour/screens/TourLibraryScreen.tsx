import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder } from 'lucide-react';
import { getScriptCollections } from '@/repositories/script-collections';
import { getScriptFeeds } from '@/repositories/script-feeds';
import { FeedFeed, type FeedItem } from '../../views/FeedFeed';
import { useRingRef } from '../TourRing';
import type { TourStageSlice } from '../tourStages';

export interface TourLibraryScreenProps {
  /** Per-frame scrub subscription from the parent's useTourScroll. */
  subscribe: (cb: (slice: TourStageSlice, progress: number) => void) => () => void;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const PREFERRED_COLLECTION_IDS = new Set([
  'crossfit-games-2024',
  'crossfit-girls',
  'dan-john',
  'geoff-neupert',
  'girevoy-sport',
]);

export function TourLibraryScreen({ subscribe }: TourLibraryScreenProps) {
  const navigate = useNavigate();
  const registerCollections = useRingRef('library.collections');
  const registerFeeds = useRingRef('library.feeds');
  // Local refs for the stagger scrub; merged with ring registration.
  const collectionsColRef = useRef<HTMLDivElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const collectionsRef = useCallback(
    (el: HTMLDivElement | null) => {
      collectionsColRef.current = el;
      registerCollections(el);
    },
    [registerCollections],
  );
  const feedsColRef = useCallback(
    (el: HTMLDivElement | null) => {
      registerFeeds(el);
    },
    [registerFeeds],
  );

  const collections = useMemo(() => {
    const all = getScriptCollections();
    const preferred = [...PREFERRED_COLLECTION_IDS]
      .map((id) => all.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    if (preferred.length > 0) return preferred.slice(0, 5);
    return all.slice(0, 5);
  }, []);

  const { feedItems, feedDateKeys } = useMemo(() => {
    const allFeeds = getScriptFeeds();
    const items: FeedItem[] = allFeeds
      .flatMap((feed) =>
        feed.items.map((item) => ({
          id: item.id,
          feedId: feed.id,
          feedName: feed.name,
          feedDate: item.feedDate,
          name: item.name,
          content: item.content,
          path: item.path,
        })),
      )
      .sort((a, b) => b.feedDate.localeCompare(a.feedDate))
      .slice(0, 7);

    const dateKeys = Array.from(new Set(items.map((i) => i.feedDate))).sort().reverse();
    return { feedItems: items, feedDateKeys: dateKeys };
  }, []);

  const handleSelectFeedItem = useCallback(
    (item: FeedItem) => {
      navigate(
        `/feeds/${encodeURIComponent(item.feedId)}/${item.feedDate}/${encodeURIComponent(
          item.id.split('/').pop()!,
        )}`,
      );
    },
    [navigate],
  );

  useEffect(() => {
    const collectRows = (): HTMLElement[] => {
      const leftRows =
        collectionsColRef.current?.querySelectorAll<HTMLElement>('[data-tour-row]') ?? [];
      const feedRoot = feedRef.current?.querySelector(':scope > *');
      const rightRows = feedRoot ? (Array.from(feedRoot.children) as HTMLElement[]) : [];
      return [...Array.from(leftRows), ...rightRows];
    };

    const resetRows = () => {
      collectRows().forEach((row) => {
        row.style.opacity = '';
        row.style.transform = '';
      });
    };

    const unsubscribe = subscribe((slice) => {
      const rows = collectRows();

      if (slice.stage.id !== 'library') {
        rows.forEach((row) => {
          row.style.opacity = '';
          row.style.transform = '';
        });
        return;
      }

      const g = clamp01(slice.t / 0.6);
      rows.forEach((row, i) => {
        const k = clamp01(g * 2.2 - i * 0.22);
        row.style.opacity = String(k);
        row.style.transform = `translateY(${(1 - k) * 16}px)`;
      });
    });

    return () => {
      resetRows();
      unsubscribe();
    };
  }, [subscribe]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="px-6 pt-5 pb-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Library / Collections & Feeds — predefined programming
        </div>
      </div>

      <div className="grid grid-cols-[1.15fr_1fr] gap-4 flex-1 min-h-0 p-6 pt-0">
        {/* LEFT — Collections */}
        <div
          ref={collectionsRef}
          className="bg-card rounded-xl border border-border flex flex-col overflow-hidden"
        >
          <div className="flex items-center px-4 py-3 border-b border-border">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              COLLECTIONS
            </span>
            <span
              className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{ color: 'hsl(var(--metric-rep))' }}
            >
              {collections.length} bundled
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {collections.map((collection) => (
              <button
                key={collection.id}
                data-tour-row
                onClick={() => navigate(`/collections/${encodeURIComponent(collection.id)}`)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
              >
                <div
                  className="flex-shrink-0 size-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--metric-rep) / 0.16)' }}
                >
                  <Folder className="size-4" style={{ color: 'hsl(var(--metric-rep))' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-foreground truncate">
                    {collection.name}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate">
                    {collection.count} workouts
                    {collection.categories.length > 0 && (
                      <> · {collection.categories.map((c) => c.toUpperCase()).join(' · ')}</>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — Feeds */}
        <div
          ref={feedsColRef}
          className="bg-card rounded-xl border border-border flex flex-col overflow-hidden"
        >
          <div className="flex items-center px-4 py-3 border-b border-border">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              FEEDS
            </span>
            <span
              className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{ color: 'hsl(var(--metric-rep))' }}
            >
              subscribed
            </span>
          </div>

          <div ref={feedRef} className="flex-1 min-h-0 overflow-hidden">
            <FeedFeed
              dateKeys={feedDateKeys}
              items={feedItems}
              journalEntries={new Map()}
              onSelectItem={handleSelectFeedItem}
              className="flex-1 min-h-0 overflow-y-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
