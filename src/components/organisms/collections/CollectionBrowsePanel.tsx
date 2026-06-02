import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WodCollection, WodCollectionItem } from '@/repositories/wod-collections';
import { CollectionCard } from './CollectionCard';

export interface CollectionBrowsePanelProps {
  collections: WodCollection[];
  onSelectItem: (item: WodCollectionItem, collection: WodCollection) => void;
  className?: string;
}

export const CollectionBrowsePanel: React.FC<CollectionBrowsePanelProps> = ({
  collections,
  onSelectItem,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  const topCollections = useMemo(
    () => collections.filter(c => !c.parent),
    [collections],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const results: { item: WodCollectionItem; collection: WodCollection }[] = [];

    for (const col of collections) {
      if (activeCollectionId) {
        // Include the selected collection and its children
        if (col.id !== activeCollectionId && col.parent !== activeCollectionId) continue;
      }
      for (const item of col.items) {
        if (!q || item.name.toLowerCase().includes(q)) {
          results.push({ item, collection: col });
        }
      }
    }
    return results;
  }, [collections, activeCollectionId, searchQuery]);

  const activeLabel = useMemo(() => {
    if (!activeCollectionId) return null;
    return collections.find(c => c.id === activeCollectionId)?.name ?? null;
  }, [collections, activeCollectionId]);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Search bar */}
      <div className="shrink-0 p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search workouts…"
            className={cn(
              'w-full pl-8 pr-7 py-1.5 text-sm rounded-md',
              'bg-muted/50 border border-border/50',
              'placeholder:text-muted-foreground/60',
              'focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50',
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collection filter chips */}
      <div className="shrink-0 px-3 py-2 flex gap-1.5 overflow-x-auto border-b border-border/50">
        <button
          type="button"
          onClick={() => setActiveCollectionId(null)}
          className={cn(
            'shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors',
            activeCollectionId === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
          )}
        >
          All
        </button>
        {topCollections.map(col => (
          <button
            key={col.id}
            type="button"
            onClick={() =>
              setActiveCollectionId(prev => (prev === col.id ? null : col.id))
            }
            className={cn(
              'shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap',
              activeCollectionId === col.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
          >
            {col.name}
            <span className="ml-1 opacity-60">{col.count}</span>
          </button>
        ))}
      </div>

      {/* Result count bar */}
      <div className="shrink-0 px-4 py-1.5 flex items-center gap-2 text-[11px] text-muted-foreground border-b border-border/30">
        <span>
          {filteredItems.length} workout{filteredItems.length !== 1 ? 's' : ''}
        </span>
        {activeLabel && (
          <>
            <span className="opacity-40">·</span>
            <span className="text-primary/80">{activeLabel}</span>
          </>
        )}
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No workouts found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredItems.map(({ item, collection }) => (
              <CollectionCard
                key={`${collection.id}:${item.id}`}
                item={item}
                collectionId={collection.id}
                collectionName={collection.name}
                onClick={() => onSelectItem(item, collection)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
