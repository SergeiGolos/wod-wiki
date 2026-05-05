import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { renderTemplateSlot, type TemplateSlot } from './templateSlots';

export interface CollectionListGroup<TItem> {
  id: string;
  label?: string;
  items: TItem[];
}

export interface CollectionListTemplateContext<TQuery, TRecord, TItem> {
  query: TQuery;
  records: TRecord[];
  items: TItem[];
  groups: CollectionListGroup<TItem>[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export interface CollectionListTemplateProps<TQuery, TRecord, TItem> {
  query: TQuery;
  loadRecords: (query: TQuery) => Promise<TRecord[]> | TRecord[];
  mapRecordToItem: (record: TRecord, query: TQuery) => TItem;
  getItemKey: (item: TItem) => string;
  renderRecord: (item: TItem, context: CollectionListTemplateContext<TQuery, TRecord, TItem>) => React.ReactNode;
  groupItems?: (items: TItem[], query: TQuery) => CollectionListGroup<TItem>[];
  prependedCanvas?: TemplateSlot<CollectionListTemplateContext<TQuery, TRecord, TItem>>;
  filterSlot?: TemplateSlot<CollectionListTemplateContext<TQuery, TRecord, TItem>>;
  searchSlot?: TemplateSlot<CollectionListTemplateContext<TQuery, TRecord, TItem>>;
  emptyState?: TemplateSlot<CollectionListTemplateContext<TQuery, TRecord, TItem>>;
  loadingState?: React.ReactNode;
  errorState?: (error: string, context: CollectionListTemplateContext<TQuery, TRecord, TItem>) => React.ReactNode;
  className?: string;
}

export function CollectionListTemplate<TQuery, TRecord, TItem>({
  query,
  loadRecords,
  mapRecordToItem,
  getItemKey,
  renderRecord,
  groupItems,
  prependedCanvas,
  filterSlot,
  searchSlot,
  emptyState,
  loadingState,
  errorState,
  className,
}: CollectionListTemplateProps<TQuery, TRecord, TItem>) {
  const [records, setRecords] = useState<TRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken(current => current + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function runLoad() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedRecords = await Promise.resolve(loadRecords(query));
        if (!isCancelled) {
          setRecords(loadedRecords);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
          setRecords([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    runLoad();

    return () => {
      isCancelled = true;
    };
  }, [loadRecords, query, reloadToken]);

  const items = useMemo(
    () => records.map(record => mapRecordToItem(record, query)),
    [mapRecordToItem, query, records],
  );

  const groups = useMemo(() => {
    if (groupItems) {
      return groupItems(items, query);
    }

    return [{ id: 'all', items }];
  }, [groupItems, items, query]);

  const context = useMemo<CollectionListTemplateContext<TQuery, TRecord, TItem>>(
    () => ({
      query,
      records,
      items,
      groups,
      isLoading,
      error,
      reload,
    }),
    [error, groups, isLoading, items, query, records, reload],
  );

  const renderedPrependedCanvas = renderTemplateSlot(prependedCanvas, context);
  const renderedFilterSlot = renderTemplateSlot(filterSlot, context);
  const renderedSearchSlot = renderTemplateSlot(searchSlot, context);
  const renderedEmptyState = renderTemplateSlot(emptyState, context);

  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full overflow-hidden bg-card', className)}>
        {loadingState ?? (
          <div className="flex flex-1 items-center justify-center p-20 text-sm font-medium text-muted-foreground">
            Loading collections…
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col h-full overflow-hidden bg-card', className)}>
        {errorState?.(error, context) ?? (
          <div className="flex flex-1 items-center justify-center p-20 text-sm font-medium text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-card', className)}>
      {renderedPrependedCanvas}
      {renderedSearchSlot ? (
        <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-md">
          {renderedSearchSlot}
        </div>
      ) : null}
      {renderedFilterSlot}
      <div className="flex-1 overflow-y-auto">
        {groups.every(group => group.items.length === 0) ? (
          renderedEmptyState ?? (
            <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
              <p className="text-sm font-medium">No collections found.</p>
            </div>
          )
        ) : (
          groups.map(group => (
            <div key={group.id} className="divide-y divide-border">
              {group.label ? (
                <div className="px-6 pt-5 pb-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase bg-muted/30">
                  {group.label}
                </div>
              ) : null}
              {group.items.map(item => (
                <div key={getItemKey(item)}>{renderRecord(item, context)}</div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
