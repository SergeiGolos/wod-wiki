import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WodCollection } from '@/repositories/wod-collections'

export interface CollectionCommandBarProps {
  collections: WodCollection[]
  activeCollectionId: string
  query: string
  onQueryChange: (q: string) => void
  onCollectionChange: (id: string) => void
}

export function CollectionCommandBar({
  collections,
  activeCollectionId,
  query,
  onQueryChange,
  onCollectionChange,
}: CollectionCommandBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Collection tabs — horizontal pill row */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {collections.map((col) => (
          <button
            key={col.id}
            onClick={() => onCollectionChange(col.id)}
            className={cn(
              'text-[10px] font-black uppercase tracking-[0.12em] px-3.5 py-1.5 rounded-full transition-all ring-1 whitespace-nowrap shrink-0',
              activeCollectionId === col.id
                ? 'bg-primary text-primary-foreground ring-primary/30 shadow-md'
                : 'bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted hover:ring-border'
            )}
          >
            {col.name}
          </button>
        ))}
      </div>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search workouts…"
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 text-sm font-medium ring-1 ring-border focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  )
}
