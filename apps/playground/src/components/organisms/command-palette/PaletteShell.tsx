import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { usePaletteStore } from './palette-store';
import { CommandListView } from '@/components/molecules/CommandListView';
import type { IListItem } from '@/components/molecules/types';
import type { PaletteItem } from './palette-types';
import { WqlComposer } from '@bitcobblers/wod-wiki-ui';

/** Mobile palette floats just below the viewport top edge (the overlay covers
 *  the page nav, so docking under it would read as glued to a dimmed bar). */
const MOBILE_TOP_PX = 2;
/** Gap kept between the palette's bottom edge and the soft keyboard. */
const MOBILE_BOTTOM_GAP_PX = 8;

/** Map a PaletteItem to the generic list view model. */
function toListItem(item: PaletteItem): IListItem<PaletteItem> {
  return {
    id: item.id,
    label: item.label,
    subtitle: item.sublabel,
    group: item.category,
    keywords: [item.label, item.category ?? ''],
    payload: item,
  };
}

/**
 * PaletteShell — the single palette UI for the entire app.
 *
 * Mount once at the app root (inside the router).
 * Open imperatively from anywhere:
 *
 *   const result = await usePaletteStore.getState().open({ sources: [...] });
 *   if (!result.dismissed) { handle(result.item); }
 *
 * WQL mode (request.wql, issue #834): the plain text input is replaced by the
 * shared WqlComposer and sources receive the composed WQL string. Keyboard
 * flow end-to-end: composer autofocuses, Enter commits free text as a text
 * clause, ArrowDown moves into the result list, Enter activates the item.
 */
export const PaletteShell: React.FC = () => {
  const { isOpen, request, _select, _dismiss } = usePaletteStore();

  const [query, setQuery] = useState('');
  // WQL mode: the composer's debounced live emission (committed pills +
  // pending text as a text filter) — this is the string the sources search.
  const [liveWql, setLiveWql] = useState('');
  const activeQuery = request?.wql ? liveWql : query;
  const [results, setResults] = useState<IListItem<PaletteItem>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchVersion = useRef(0);
  // Stable ref to the current request identity — used to detect step transitions.
  const requestRef = useRef(request);
  // Render-time identity tracking: remounts the composer on every new request
  // so its clause state never leaks across steps.
  const requestSeqRef = useRef(0);
  if (requestRef.current !== request) {
    requestRef.current = request;
    requestSeqRef.current += 1;
  }

  const wqlConfig = request?.wql;

  // Mobile (<lg): the palette floats near the viewport top and its height is
  // capped to the visual viewport so the soft keyboard never covers results.
  // Tracked live (on open + viewport resize/scroll — both fire when the
  // keyboard opens). Desktop keeps the 20% drop and no cap.
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    const update = () => setViewportHeight(vv?.height ?? window.innerHeight);
    update();
    window.addEventListener('resize', update);
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, [isOpen]);

  // Reset query + results whenever the request changes (new step) or the palette opens.
  useEffect(() => {
    if (isOpen && request) {
      // WQL mode: seed the live query from the initial WQL — the composer
      // owns further emissions; resetting here would clobber it.
      if (request.wql) setLiveWql(request.wql.initialQuery ?? '');
      else setQuery(request.initialQuery ?? '');
      setResults([]);
      setIsLoading(false);
    }
  }, [isOpen, request]); // request is a new object on every open() call

  // Search all sources whenever the live query changes (the composer
  // debounces ~150ms so typing narrows results without per-keystroke runs).
  useEffect(() => {
    if (!isOpen || !request) return;

    const version = ++searchVersion.current;
    setIsLoading(true);

    const timer = setTimeout(() => {
      const run = async () => {
        try {
          const settled = await Promise.all(
            request.sources.map(source =>
              Promise.resolve(source.search(activeQuery)).then(items =>
                items.map(item => ({
                  ...toListItem(item),
                  // Prefix source label as group if item has no category
                  group: item.category ?? source.label,
                }))
              )
            )
          );
          if (version !== searchVersion.current) return; // stale
          setResults(settled.flat());
        } catch (err) {
          console.error('[PaletteShell] search error', err);
          if (version === searchVersion.current) setResults([]);
        } finally {
          if (version === searchVersion.current) setIsLoading(false);
        }
      };
      void run();
    }, 150);

    return () => clearTimeout(timer);
  }, [activeQuery, isOpen, request]);
  const handleSelect = useCallback(
    (item: IListItem<PaletteItem>) => {
      _select(item.payload);
    },
    [_select]
  );

  const emptyState = isLoading ? (
    <div className="py-8 text-center text-sm text-muted-foreground">Searching…</div>
  ) : activeQuery ? (
    <div className="py-8 text-center text-sm text-muted-foreground">
      No results for <span className="font-medium text-zinc-600 dark:text-zinc-300">&ldquo;{activeQuery}&rdquo;</span>
    </div>
  ) : (
    <div className="py-8 text-center text-sm text-muted-foreground">Start typing to search</div>
  );

  const applyQuery = useCallback(() => {
    if (!wqlConfig?.onApply) return;
    wqlConfig.onApply(activeQuery);
    _dismiss();
  }, [wqlConfig, activeQuery, _dismiss]);

  const searchRow = wqlConfig ? (
    <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
      <WqlComposer
        key={requestSeqRef.current}
        initialQuery={wqlConfig.initialQuery}
        onQueryChange={setQuery}
        onLiveQueryChange={setLiveWql}
        showDiagnostics={wqlConfig.showDiagnostics ?? true}
        execute={wqlConfig.execute}
        customSlots={wqlConfig.customSlots}
        onSubmit={wqlConfig.onApply ? applyQuery : undefined}
        autoFocus
      />
      {wqlConfig.onApply && (
        <div className="flex items-center justify-end pt-1.5">
          <button
            type="button"
            onClick={applyQuery}
            data-testid="palette-apply-query"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Apply query
          </button>
        </div>
      )}
    </div>
  ) : undefined;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) _dismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 dark:bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={`fixed left-1/2 z-50 flex w-full flex-col ${wqlConfig ? 'max-w-2xl' : 'max-w-xl'} -translate-x-1/2 outline-none shadow-2xl top-[2px] lg:top-[20%] max-lg:max-h-[var(--palette-max-h)]`}
          style={{
            // 160px floor so the input row never collapses on short landscape
            // viewports.
            '--palette-max-h': viewportHeight
              ? `${Math.max(viewportHeight - MOBILE_TOP_PX - MOBILE_BOTTOM_GAP_PX, 160)}px`
              : undefined,
          } as React.CSSProperties}
        >
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search and navigate. Press Escape to close.
          </Dialog.Description>

          {/* flex-1/min-h-0: lets the results list shrink + scroll inside the
              mobile max-height cap instead of overflowing under the keyboard. */}
          <CommandListView
            className="min-h-0 flex-1"
            items={results}
            query={query}
            onQueryChange={setQuery}
            onSelect={handleSelect}
            isOpen={true}
            onClose={_dismiss}
            placeholder={request?.placeholder ?? 'Search…'}
            searchRow={searchRow}
            filterResults={!wqlConfig}
            header={request?.header}
            emptyState={emptyState}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
