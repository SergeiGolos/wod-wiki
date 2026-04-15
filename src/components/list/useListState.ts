import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { IListItem } from './types';

export interface UseListStateOptions<TPayload> {
  items: IListItem<TPayload>[];
  defaultActiveId?: string;
  multi?: boolean;
  searchable?: boolean;
  onSelect?: (item: IListItem<TPayload>) => void;
}

export interface ListState<TPayload> {
  /** Filtered + grouped items ready for rendering */
  visibleItems: IListItem<TPayload>[];
  /** Grouped items map (group label → items), only populated when grouped=true */
  groups: Map<string, IListItem<TPayload>[]>;
  /** Currently keyboard-focused item id */
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  /** Selected item ids (multi-select) */
  selectedIds: Set<string>;
  toggleSelected: (id: string, modifiers?: { shift?: boolean; ctrl?: boolean }) => void;
  clearSelection: () => void;
  /** Search query */
  query: string;
  setQuery: (q: string) => void;
  /** Keyboard handler — attach to the list container's onKeyDown */
  onKeyDown: (e: React.KeyboardEvent) => void;
  /** Call when an item is activated (click or Enter) */
  selectItem: (item: IListItem<TPayload>) => void;
}

function matchesQuery<T>(item: IListItem<T>, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  if (item.label.toLowerCase().includes(lower)) return true;
  if (item.subtitle?.toLowerCase().includes(lower)) return true;
  if (item.keywords?.some(k => k.toLowerCase().includes(lower))) return true;
  return false;
}

export function useListState<TPayload>(
  options: UseListStateOptions<TPayload>,
): ListState<TPayload> {
  const { items, defaultActiveId, multi = false, onSelect } = options;

  const [activeId, setActiveId] = useState<string | null>(defaultActiveId ?? null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const lastSelectedRef = useRef<string | null>(null);

  // Reset active item when items list changes identity
  useEffect(() => {
    if (defaultActiveId !== undefined) setActiveId(defaultActiveId);
  }, [defaultActiveId]);

  const visibleItems = useMemo(() => {
    if (!query) return items;
    return items.filter(item => matchesQuery(item, query));
  }, [items, query]);

  const groups = useMemo(() => {
    const map = new Map<string, IListItem<TPayload>[]>();
    for (const item of visibleItems) {
      const key = item.group ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [visibleItems]);

  const toggleSelected = useCallback(
    (id: string, modifiers?: { shift?: boolean; ctrl?: boolean }) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (multi && modifiers?.shift && lastSelectedRef.current) {
          const fromIdx = visibleItems.findIndex(i => i.id === lastSelectedRef.current);
          const toIdx = visibleItems.findIndex(i => i.id === id);
          if (fromIdx !== -1 && toIdx !== -1) {
            const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
            visibleItems.slice(lo, hi + 1).forEach(i => next.add(i.id));
          }
        } else if (multi && modifiers?.ctrl) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        } else {
          next.clear();
          next.add(id);
        }
        return next;
      });
      lastSelectedRef.current = id;
    },
    [multi, visibleItems],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedRef.current = null;
  }, []);

  const selectItem = useCallback(
    (item: IListItem<TPayload>) => {
      setActiveId(item.id);
      toggleSelected(item.id);
      onSelect?.(item);
    },
    [onSelect, toggleSelected],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!visibleItems.length) return;
      const currentIdx = visibleItems.findIndex(i => i.id === activeId);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = visibleItems[Math.min(currentIdx + 1, visibleItems.length - 1)];
        setActiveId(next.id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = visibleItems[Math.max(currentIdx - 1, 0)];
        setActiveId(prev.id);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = visibleItems.find(i => i.id === activeId);
        if (active) selectItem(active);
      } else if (e.key === 'Escape') {
        clearSelection();
      }
    },
    [visibleItems, activeId, selectItem, clearSelection],
  );

  return {
    visibleItems,
    groups,
    activeId,
    setActiveId,
    selectedIds,
    toggleSelected,
    clearSelection,
    query,
    setQuery,
    onKeyDown,
    selectItem,
  };
}
