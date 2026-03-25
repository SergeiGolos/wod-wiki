import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderIcon, SearchIcon, ChevronRightIcon } from 'lucide-react';
import { getWodCollections, type WodCollection } from '@/repositories/wod-collections';

/** Predefined category grouping — collections-only, hidden from user controls */
const COLLECTION_GROUPS: Record<string, string[]> = {
  Kettlebell: [
    'kettlebell', 'dan-john', 'geoff-neupert', 'girevoy-sport',
    'joe-daniels', 'keith-weber', 'mark-wildman', 'steve-cotter', 'strongfirst',
  ],
  Crossfit: ['crossfit-games', 'crossfit-girls'],
  Swimming: [
    'swimming-pre-highschool', 'swimming-highschool', 'swimming-college',
    'swimming-post-college', 'swimming-masters', 'swimming-olympic', 'swimming-triathlete',
  ],
  Other: ['unconventional'],
};

const ASSIGNED = new Set(Object.values(COLLECTION_GROUPS).flat());

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

/** Query organism — hidden predefined filter that constrains the list to collections only.
 *  Renders a minimal text input for filtering; category/type controls are intentionally absent. */
function CollectionsQueryOrganism({
  text,
  onTextChange,
}: {
  text: string;
  onTextChange: (v: string) => void;
}) {
  return (
    <div className="shrink-0 border-b border-border px-6 py-3 flex items-center gap-3">
      <SearchIcon className="size-4 text-muted-foreground shrink-0" />
      <input
        type="text"
        placeholder="Filter collections…"
        value={text}
        onChange={e => onTextChange(e.target.value)}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

export function CollectionsPage() {
  const [text, setText] = useState('');
  const allCollections = useMemo(() => getWodCollections(), []);

  const filtered = useMemo(() => {
    if (!text.trim()) return allCollections;
    const q = text.toLowerCase();
    return allCollections.filter(c =>
      c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
    );
  }, [allCollections, text]);

  const grouped = useMemo(() => {
    const filteredMap = new Map(filtered.map(c => [c.id, c]));
    const result: { label: string; items: WodCollection[] }[] = [];
    for (const [label, ids] of Object.entries(COLLECTION_GROUPS)) {
      const items = ids.map(id => filteredMap.get(id)).filter(Boolean) as WodCollection[];
      if (items.length > 0) result.push({ label, items });
    }
    // Ungrouped collections not in any predefined category
    const ungrouped = filtered.filter(c => !ASSIGNED.has(c.id));
    if (ungrouped.length > 0) {
      const existing = result.find(g => g.label === 'Other');
      if (existing) existing.items.push(...ungrouped);
      else result.push({ label: 'Other', items: ungrouped });
    }
    return result;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      <CollectionsQueryOrganism text={text} onTextChange={setText} />
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
