import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryState } from 'nuqs';
import { ChevronRightIcon, DumbbellIcon } from 'lucide-react';
import type { WorkoutItem } from '../../App';
import { cn } from '@/lib/utils';
import {
  TextFilterStrip,
  TEXT_FILTER_NAVIGATION_EVENT,
  type TextFilterNavigationDetail,
} from './TextFilterStrip';

export interface CollectionWorkoutsListAction {
  id: string;
  label: string;
  onSelect: (item: WorkoutItem) => void;
}

interface CollectionWorkoutsListProps {
  category: string;
  workoutItems: WorkoutItem[];
  onSelect: (item: WorkoutItem) => void;
  showSearch?: boolean;
  variant?: 'flat' | 'card';
  className?: string;
  navigationScope?: string;
  getItemActions?: (item: WorkoutItem) => CollectionWorkoutsListAction[];
}

function getWorkoutPreview(content?: string): string | null {
  if (!content) return null;

  const stripped = content
    .replace(/^---[\s\S]*?---\s*/m, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('```'));

  return stripped[0] ?? null;
}

export const CollectionWorkoutsList: React.FC<CollectionWorkoutsListProps> = ({
  category,
  workoutItems,
  onSelect,
  showSearch = true,
  variant = 'card',
  className,
  navigationScope = 'q',
  getItemActions,
}) => {
  const [queryText] = useQueryState('q', { defaultValue: '' });
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [selectedActionIndex, setSelectedActionIndex] = useState(0);
  const actionRefs = useRef<Array<Array<HTMLButtonElement | null>>>([]);

  const collectionItems = useMemo(
    () => workoutItems
      .filter(item => item.category === category && item.name.toLowerCase() !== 'readme')
      .filter(item => {
        if (!queryText.trim()) return true;
        const normalizedQuery = queryText.toLowerCase();
        return item.name.toLowerCase().includes(normalizedQuery)
          || item.content.toLowerCase().includes(normalizedQuery);
      }),
    [workoutItems, category, queryText],
  );

  const collectionEntries = useMemo(
    () => collectionItems.map(item => ({
      item,
      preview: getWorkoutPreview(item.content),
      actions: getItemActions?.(item) ?? [
        {
          id: 'open',
          label: 'Open',
          onSelect,
        },
      ],
    })),
    [collectionItems, getItemActions, onSelect],
  );

  useEffect(() => {
    if (collectionEntries.length === 0) {
      setSelectedRowIndex(0);
      setSelectedActionIndex(0);
      return;
    }

    const clampedRowIndex = Math.min(selectedRowIndex, collectionEntries.length - 1);
    const maxActionIndex = collectionEntries[clampedRowIndex]?.actions.length ?? 1;

    if (clampedRowIndex !== selectedRowIndex) {
      setSelectedRowIndex(clampedRowIndex);
    }

    if (selectedActionIndex > maxActionIndex - 1) {
      setSelectedActionIndex(maxActionIndex - 1);
    }
  }, [collectionEntries, selectedActionIndex, selectedRowIndex]);

  useEffect(() => {
    actionRefs.current = [];
  }, [collectionEntries]);

  useEffect(() => {
    setSelectedRowIndex(0);
    setSelectedActionIndex(0);
  }, [queryText]);

  useEffect(() => {
    const currentAction = actionRefs.current[selectedRowIndex]?.[selectedActionIndex];
    currentAction?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedActionIndex, selectedRowIndex]);

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const navigationEvent = event as CustomEvent<TextFilterNavigationDetail>;

      if (navigationEvent.detail.scopeId !== navigationScope) return;
      if (collectionEntries.length === 0) return;

      switch (navigationEvent.detail.key) {
        case 'ArrowDown': {
          navigationEvent.preventDefault();
          setSelectedRowIndex(currentIndex => Math.min(currentIndex + 1, collectionEntries.length - 1));
          setSelectedActionIndex(0);
          break;
        }
        case 'ArrowUp': {
          navigationEvent.preventDefault();
          setSelectedRowIndex(currentIndex => Math.max(currentIndex - 1, 0));
          setSelectedActionIndex(0);
          break;
        }
        case 'ArrowRight': {
          const actionCount = collectionEntries[selectedRowIndex]?.actions.length ?? 1;
          if (actionCount <= 1) return;
          navigationEvent.preventDefault();
          setSelectedActionIndex(currentIndex => Math.min(currentIndex + 1, actionCount - 1));
          break;
        }
        case 'ArrowLeft': {
          const actionCount = collectionEntries[selectedRowIndex]?.actions.length ?? 1;
          if (actionCount <= 1) return;
          navigationEvent.preventDefault();
          setSelectedActionIndex(currentIndex => Math.max(currentIndex - 1, 0));
          break;
        }
        case 'Enter': {
          const action = collectionEntries[selectedRowIndex]?.actions[selectedActionIndex];
          const item = collectionEntries[selectedRowIndex]?.item;
          if (!action || !item) return;
          navigationEvent.preventDefault();
          action.onSelect(item);
          break;
        }
      }
    };

    window.addEventListener(TEXT_FILTER_NAVIGATION_EVENT, handleNavigation as EventListener);
    return () => {
      window.removeEventListener(TEXT_FILTER_NAVIGATION_EVENT, handleNavigation as EventListener);
    };
  }, [collectionEntries, navigationScope, selectedActionIndex, selectedRowIndex]);

  return (
    <div
      className={cn(
        'flex flex-col',
        variant === 'card' && 'rounded-3xl border border-border bg-card overflow-hidden shadow-2xl shadow-black/5',
        className,
      )}
    >
      {showSearch ? (
        <div className="border-b border-border/60 bg-background/95 backdrop-blur-md">
          <TextFilterStrip
            placeholder="Filter collection workouts…"
            className="pt-3"
            navigationScope={navigationScope}
          />
        </div>
      ) : null}

      {collectionEntries.length === 0 ? (
        <div className="px-6 py-10 text-sm font-medium text-muted-foreground">
          No workouts found.
        </div>
      ) : (
        <div className="divide-y divide-border/60" role="listbox" aria-label="Collection workouts">
          {collectionEntries.map((entry, rowIndex) => {
            const isSelectedRow = rowIndex === selectedRowIndex;

            return (
              <div
                key={entry.item.id}
                role="option"
                aria-selected={isSelectedRow}
                className={cn(
                  'flex items-stretch gap-2 px-3 py-2 transition-colors',
                  isSelectedRow ? 'bg-muted/50' : 'hover:bg-muted/40',
                )}
              >
                {entry.actions.map((action, actionIndex) => {
                  const isMainAction = actionIndex === 0;
                  const isSelectedAction = isSelectedRow && actionIndex === selectedActionIndex;

                  return (
                    <button
                      key={action.id}
                      ref={element => {
                        if (!actionRefs.current[rowIndex]) actionRefs.current[rowIndex] = [];
                        actionRefs.current[rowIndex][actionIndex] = element;
                      }}
                      onClick={() => action.onSelect(entry.item)}
                      onMouseEnter={() => {
                        setSelectedRowIndex(rowIndex);
                        setSelectedActionIndex(actionIndex);
                      }}
                      className={cn(
                        'transition-colors text-left',
                        isMainAction
                          ? 'flex-1 flex items-center gap-4 rounded-2xl px-3 py-2 hover:bg-background/80'
                          : 'shrink-0 self-center rounded-full border border-border px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground hover:bg-background/80 hover:text-foreground',
                        isSelectedAction && 'bg-background text-foreground ring-2 ring-primary/40',
                      )}
                    >
                      {isMainAction ? (
                        <>
                          <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center transition-colors">
                            <DumbbellIcon className="size-4 text-primary" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
                              {entry.item.name}
                            </h3>
                            {entry.preview ? (
                              <p className="text-xs text-muted-foreground font-medium truncate mt-1">
                                {entry.preview}
                              </p>
                            ) : null}
                          </div>

                          <ChevronRightIcon className="size-4 text-muted-foreground shrink-0 transition-opacity" />
                        </>
                      ) : (
                        action.label
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
