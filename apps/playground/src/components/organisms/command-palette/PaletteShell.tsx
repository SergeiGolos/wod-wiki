import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { usePaletteStore } from './palette-store';
import { CommandListView } from '@/components/molecules/CommandListView';
import type { IListItem } from '@/components/molecules/types';
import type { PaletteItem } from './palette-types';
import { WqlComposer } from '@bitcobblers/wod-wiki-ui';

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

  // Reset query + results whenever the request changes (new step) or the palette opens.
  useEffect(() => {
    if (isOpen && request) {
      // WQL mode: the composer owns the query — it emits the composed WQL on
      // mount and every clause change; resetting here would clobber it.
      if (!request.wql) setQuery(request.initialQuery ?? '');
      setResults([]);
      setIsLoading(false);
    }
  }, [isOpen, request]); // request is a new object on every open() call

  // Search all sources whenever query changes
  useEffect(() => {
    if (!isOpen || !request) return;

    const version = ++searchVersion.current;
    setIsLoading(true);

    const run = async () => {
      try {
        const settled = await Promise.all(
          request.sources.map(source =>
            Promise.resolve(source.search(query)).then(items =>
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

    run();
  }, [query, isOpen, request]);

  const handleSelect = useCallback(
    (item: IListItem<PaletteItem>) => {
      _select(item.payload);
    },
    [_select]
  );

  const emptyState = isLoading ? (
    <div className="py-8 text-center text-sm text-muted-foreground">Searching…</div>
  ) : query ? (
    <div className="py-8 text-center text-sm text-muted-foreground">
      No results for <span className="font-medium text-zinc-600 dark:text-zinc-300">&ldquo;{query}&rdquo;</span>
    </div>
  ) : (
    <div className="py-8 text-center text-sm text-muted-foreground">Start typing to search</div>
  );

  const searchRow = wqlConfig ? (
    <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
      <WqlComposer
        key={requestSeqRef.current}
        initialQuery={wqlConfig.initialQuery}
        onQueryChange={setQuery}
        showDiagnostics={wqlConfig.showDiagnostics ?? true}
        execute={wqlConfig.execute}
        customSlots={wqlConfig.customSlots}
        autoFocus
      />
    </div>
  ) : undefined;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) _dismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 dark:bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className={`fixed left-1/2 top-[20%] z-50 w-full ${wqlConfig ? 'max-w-2xl' : 'max-w-xl'} -translate-x-1/2 outline-none shadow-2xl`}>
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search and navigate. Press Escape to close.
          </Dialog.Description>

          <CommandListView
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
