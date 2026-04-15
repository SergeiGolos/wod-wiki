import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderIcon, ChevronRightIcon } from 'lucide-react';
import { getWodCollections, type WodCollection } from '@/repositories/wod-collections';
import { useCollectionsQueryState } from '../hooks/useCollectionsQueryState';
import { COLLECTION_GROUPS, ASSIGNED } from '../config/collectionGroups';

/** Special collection link component — navigates to the collection canvas route */
function CollectionLink({ collection }: { collection: WodCollection }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/collections/${encodeURIComponent(collection.id)}`)}
      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
        <FolderIcon className="size-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
          {collection.name}
        </h3>
        <p className="text-xs text-muted-foreground font-medium">
          {collection.count} workout{collection.count !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function CollectionsPage() {
  const { text, selectedCategories } = useCollectionsQueryState();
  const allCollections = useMemo(() => getWodCollections(), []);

  const filtered = useMemo(() => {
    let result = allCollections;
    if (text.trim()) {
      const q = text.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allCollections, text]);

  const grouped = useMemo(() => {
    const filteredMap = new Map(filtered.map(c => [c.id, c]));
    const result: { label: string; items: WodCollection[] }[] = [];

    const activeGroups = selectedCategories.length > 0
      ? Object.entries(COLLECTION_GROUPS).filter(([label]) =>
          selectedCategories.includes(label.toLowerCase()),
        )
      : Object.entries(COLLECTION_GROUPS);

    for (const [label, ids] of activeGroups) {
      const items = ids.map(id => filteredMap.get(id)).filter(Boolean) as WodCollection[];
      if (items.length > 0) result.push({ label, items });
    }

    // Ungrouped collections — only show when no category filter is active
    if (selectedCategories.length === 0) {
      const ungrouped = filtered.filter(c => !ASSIGNED.has(c.id));
      if (ungrouped.length > 0) {
        const existing = result.find(g => g.label === 'Other');
        if (existing) existing.items.push(...ungrouped);
        else result.push({ label: 'Other', items: ungrouped });
      }
    }

    return result;
  }, [filtered, selectedCategories]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
            <p className="text-sm font-medium">No collections found.</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.label} className="divide-y divide-border">
              <div className="px-6 pt-5 pb-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase bg-muted/30">
                {group.label}
              </div>
              {group.items.map(collection => (
                <CollectionLink key={collection.id} collection={collection} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
