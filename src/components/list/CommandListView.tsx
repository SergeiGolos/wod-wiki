import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useListState } from './useListState';
import { DefaultListItem } from './DefaultListItem';
import { executeNavAction } from '@/nav/navTypes';
import type { NavActionDeps } from '@/nav/navTypes';
import type { IListItem, IItemAction, ListItemContext } from './types';

export interface CommandListViewProps<TPayload> {
  items: IListItem<TPayload>[];
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (item: IListItem<TPayload>) => void;
  isOpen: boolean;
  onClose: () => void;
  /** Optional custom header rendered below search input (e.g. statement builder) */
  header?: React.ReactNode;
  placeholder?: string;
  /** Per-item actions — merged with item.actions at render time */
  actions?: (item: IListItem<TPayload>) => IItemAction[];
  /** Override item renderer */
  renderItem?: (item: IListItem<TPayload>, ctx: ListItemContext) => React.ReactNode;
  /** Shown when there are no results */
  emptyState?: React.ReactNode;
  className?: string;
}

export function CommandListView<TPayload>({
  items,
  query,
  onQueryChange,
  onSelect,
  isOpen,
  onClose,
  header,
  placeholder = 'Search…',
  actions,
  renderItem,
  emptyState,
  className,
}: CommandListViewProps<TPayload>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const navDeps: NavActionDeps = useMemo(() => ({
    navigate: (to, opts) => navigate(to, opts),
    setQueryParam: (params, replace) => {
      const sp = new URLSearchParams(searchParams);
      Object.entries(params).forEach(([k, v]) => {
        if (v === null) sp.delete(k); else sp.set(k, v);
      });
      setSearchParams(sp, { replace });
    },
  }), [navigate, searchParams, setSearchParams]);

  const execAction = useCallback(
    (action: Parameters<typeof executeNavAction>[0]) => executeNavAction(action, navDeps),
    [navDeps],
  );

  /** Activation: execute primary action if present, otherwise fire host onSelect */
  const handleActivate = useCallback(
    (item: IListItem<TPayload>) => {
      const allActions = [...(item.actions ?? []), ...(actions?.(item) ?? [])];
      const primary = allActions.find(a => a.isPrimary);
      if (primary) {
        execAction(primary.action);
      } else {
        onSelect(item);
      }
    },
    [actions, onSelect, execAction],
  );

  const state = useListState({ items, onSelect: handleActivate });

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Sync external query into list state filter
  useEffect(() => {
    state.setQuery(query);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    state.onKeyDown(e);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900',
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Search row */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-700">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-zinc-400"
        />
        <kbd className="hidden rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-400 sm:inline dark:border-zinc-600">
          esc
        </kbd>
      </div>

      {/* Optional contextual header (e.g. statement builder segment UI) */}
      {header}

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-1" role="listbox">
        {/* Group headers */}
        {state.visibleItems.length === 0
          ? (emptyState ?? (
              <div className="py-8 text-center text-sm text-zinc-400">No results</div>
            ))
          : Array.from(state.groups.entries()).map(([group, groupItems]) => (
              <div key={group} className="mb-1">
                {group && (
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {group}
                  </div>
                )}
                {groupItems.map(item => {
                  const itemActions: IItemAction[] = [...(item.actions ?? []), ...(actions?.(item) ?? [])];
                  const ctx: ListItemContext = {
                    isSelected: state.selectedIds.has(item.id),
                    isActive: state.activeId === item.id,
                    depth: item.depth ?? 0,
                    actions: itemActions,
                    onSelect: () => state.selectItem(item),
                    executeAction: execAction,
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
                })}
              </div>
            ))}
      </div>
    </div>
  );
}
