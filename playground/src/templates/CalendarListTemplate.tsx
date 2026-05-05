import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { JournalDateScroll, type JournalEntrySummary } from '../views/queriable-list/JournalDateScroll';
import type { FilteredListItem } from '../views/queriable-list/types';
import { renderTemplateSlot, type TemplateSlot } from './templateSlots';

export interface CalendarListTemplateContext<TQuery, TResult, TEntrySummary extends JournalEntrySummary> {
  query: TQuery;
  results: TResult[];
  listItems: FilteredListItem[];
  journalEntries: Map<string, TEntrySummary>;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export interface CalendarListTemplateProps<TQuery, TResult, TEntrySummary extends JournalEntrySummary> {
  query: TQuery;
  loadResults: (query: TQuery) => Promise<TResult[]> | TResult[];
  loadJournalEntries: (query: TQuery) => Promise<Map<string, TEntrySummary>> | Map<string, TEntrySummary>;
  mapResultsToItems: (results: TResult[], query: TQuery) => FilteredListItem[];
  initialDate?: Date | null;
  prependedCanvas?: TemplateSlot<CalendarListTemplateContext<TQuery, TResult, TEntrySummary>>;
  filterSlot?: TemplateSlot<CalendarListTemplateContext<TQuery, TResult, TEntrySummary>>;
  searchSlot?: TemplateSlot<CalendarListTemplateContext<TQuery, TResult, TEntrySummary>>;
  renderNoteCard?: React.ComponentProps<typeof JournalDateScroll>['renderNoteCard'];
  renderResultRow?: React.ComponentProps<typeof JournalDateScroll>['renderResultRow'];
  renderEmptyDate?: React.ComponentProps<typeof JournalDateScroll>['renderEmptyDate'];
  onSelectItem: (item: FilteredListItem) => void;
  onCreateEntry?: (date: Date) => void;
  onOpenEntry?: (dateKey: string) => void;
  onVisibleDateChange?: (dateKey: string) => void;
  className?: string;
}

export function CalendarListTemplate<TQuery, TResult, TEntrySummary extends JournalEntrySummary>({
  query,
  loadResults,
  loadJournalEntries,
  mapResultsToItems,
  initialDate,
  prependedCanvas,
  filterSlot,
  searchSlot,
  renderNoteCard,
  renderResultRow,
  renderEmptyDate,
  onSelectItem,
  onCreateEntry,
  onOpenEntry,
  onVisibleDateChange,
  className,
}: CalendarListTemplateProps<TQuery, TResult, TEntrySummary>) {
  const [results, setResults] = useState<TResult[]>([]);
  const [journalEntries, setJournalEntries] = useState<Map<string, TEntrySummary>>(new Map());
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
        const [loadedResults, loadedJournalEntries] = await Promise.all([
          Promise.resolve(loadResults(query)),
          Promise.resolve(loadJournalEntries(query)),
        ]);

        if (!isCancelled) {
          setResults(loadedResults);
          setJournalEntries(loadedJournalEntries);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
          setResults([]);
          setJournalEntries(new Map());
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
  }, [loadJournalEntries, loadResults, query, reloadToken]);

  const listItems = useMemo(() => mapResultsToItems(results, query), [mapResultsToItems, query, results]);

  const context = useMemo<CalendarListTemplateContext<TQuery, TResult, TEntrySummary>>(
    () => ({
      query,
      results,
      listItems,
      journalEntries,
      isLoading,
      error,
      reload,
    }),
    [error, isLoading, journalEntries, listItems, query, reload, results],
  );

  const renderedPrependedCanvas = renderTemplateSlot(prependedCanvas, context);
  const renderedFilterSlot = renderTemplateSlot(filterSlot, context);
  const renderedSearchSlot = renderTemplateSlot(searchSlot, context);

  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full overflow-hidden bg-card', className)}>
        <div className="flex flex-1 items-center justify-center p-20 text-sm font-medium text-muted-foreground">
          Loading calendar…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col h-full overflow-hidden bg-card', className)}>
        <div className="flex flex-1 items-center justify-center p-20 text-sm font-medium text-destructive">
          {error}
        </div>
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
      <JournalDateScroll
        items={listItems}
        onSelect={onSelectItem}
        journalEntries={journalEntries}
        initialDate={initialDate ?? undefined}
        onOpenEntry={onOpenEntry}
        onCreateEntry={onCreateEntry}
        onVisibleDateChange={onVisibleDateChange}
        renderNoteCard={renderNoteCard}
        renderResultRow={renderResultRow}
        renderEmptyDate={renderEmptyDate}
        className="flex-1 min-h-0"
      />
    </div>
  );
}
