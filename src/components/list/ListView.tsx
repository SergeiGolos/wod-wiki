import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useListState } from './useListState';
import { DefaultListItem } from './DefaultListItem';
import type { IListItem, IItemAction, ListItemContext } from './types';

export interface ListViewProps<TPayload> {
  items: IListItem<TPayload>[];
  onSelect?: (item: IListItem<TPayload>) => void;
  /** Derive per-item actions from the host — keeps domain objects free of UI concerns */
  actions?: (item: IListItem<TPayload>) => IItemAction<TPayload>[];
  /** Render items grouped by item.group */
  grouped?: boolean;
  /** Show a search/filter input above the list */
  searchable?: boolean;
  /** Allow multi-select via ctrl/shift click */
  multi?: boolean;
  /** Override item renderer */
  renderItem?: (item: IListItem<TPayload>, ctx: ListItemContext<TPayload>) => React.ReactNode;
  /** Shown when visibleItems is empty */
  emptyState?: React.ReactNode;
  /** Slot rendered above the list (outside scroll area) */
  header?: React.ReactNode;
  /** Scroll the active item into view automatically */
  autoScroll?: boolean;
  className?: string;
}

export function ListView<TPayload>({
  items,
  onSelect,
  actions,
  grouped = false,
  searchable = false,
  multi = false,
  renderItem,
  emptyState,
  header,
  autoScroll = false,
  className,
}: ListViewProps<TPayload>) {
  const listRef = useRef<HTMLDivElement>(null);
  const state = useListState({ items, multi, onSelect });

  // Auto-scroll active item into view
  useEffect(() => {
    if (!autoScroll || !state.activeId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-item-id="${state.activeId}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [autoScroll, state.activeId]);

  function renderListItem(item: IListItem<TPayload>) {
    const itemActions = actions?.(item) ?? [];
    const ctx: ListItemContext<TPayload> = {
      isSelected: state.selectedIds.has(item.id),
      isActive: state.activeId === item.id,
      depth: item.depth ?? 0,
      actions: itemActions,
      onSelect: () => state.selectItem(item),
    };

    return (
      <div
        key={item.id}
        data-item-id={item.id}
        className="group"
        onMouseEnter={() => state.setActiveId(item.id)}
      >
        {renderItem ? renderItem(item, ctx) : <DefaultListItem item={item} ctx={ctx} />}
      </div>
    );
  }

  const content = grouped ? (
    Array.from(state.groups.entries()).map(([group, groupItems]) => (
      <div key={group} className="mb-2">
        {group && (
          <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {group}
          </div>
        )}
        {groupItems.map(renderListItem)}
      </div>
    ))
  ) : (
    state.visibleItems.map(renderListItem)
  );

  return (
    <div
      className={cn('flex flex-col', className)}
      onKeyDown={state.onKeyDown}
      tabIndex={0}
    >
      {header}

      {searchable && (
        <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
          <input
            type="text"
            value={state.query}
            onChange={e => state.setQuery(e.target.value)}
            placeholder="Filter…"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto" role="listbox">
        {state.visibleItems.length === 0
          ? (emptyState ?? (
              <div className="px-4 py-6 text-center text-sm text-zinc-400">No items</div>
            ))
          : content}
      </div>
    </div>
  );
}
