/**
 * Variant B1 — Freeform Spotlight Bar with Token Slots
 *
 * Spotlight input bar with ordered, tabbable Token Slot Pills.
 * Placeholder text keeps the query structure readable even when slots are empty.
 *
 * Keyboard: Tab / Shift+Tab to jump between slots, ↑ / ↓ to select values.
 */
import { useState, useRef } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { TokenSlotPill, AddFilterDropdown } from '@/components/organisms/wql-composer/QueryPalette'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
} from '@/components/organisms/wql-composer'
import { cn } from '@/lib/utils'

export function VariantA({
  clauses,
  onChange,
}: {
  clauses: QueryClause[]
  onChange: (c: QueryClause[]) => void
}) {
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const updateClause = (idx: number, patch: Partial<QueryClause>) => {
    onChange(clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const removeClause = (idx: number) => {
    onChange(clauses.filter((_, i) => i !== idx))
  }

  const addClause = (type: ClauseType) => {
    const meta = CLAUSE_META[type]
    const newClause: QueryClause = {
      id: `c-${Date.now()}-${Math.random()}`,
      type,
      label: meta.label,
      value: type === 'time' ? 'last 2w' : type === 'where' ? 'sum:totalVolume{} > 5000' : '',
      inputType: meta.inputType,
      placeholder: meta.placeholder,
    }
    onChange([...clauses, newClause])
  }

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur px-6 py-3" data-testid="variant-b1">
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-1.5 flex items-center justify-between">
        <span>B1 — Freeform Spotlight Bar with Token Slots</span>
        <span className="text-[9px] font-normal text-muted-foreground/50">Tab / Shift+Tab to cycle slots · ↑↓ to choose</span>
      </div>

      <div ref={containerRef} className="relative max-w-3xl">
        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5 min-h-[44px] rounded-xl border border-border bg-muted/20 px-3 py-1.5 text-xs transition-all shadow-xs',
            activeSlotIdx !== null && 'border-primary/60 bg-background ring-2 ring-primary/20 shadow-md',
          )}
        >
          <SearchIcon className="size-4 text-muted-foreground/60 shrink-0 mr-0.5" />

          {/* Token Slots */}
          {clauses.map((clause, idx) => (
            <TokenSlotPill
              key={clause.id}
              clause={clause}
              isActive={activeSlotIdx === idx}
              onClick={() => setActiveSlotIdx(idx)}
              onChange={patch => updateClause(idx, patch)}
              onRemove={() => removeClause(idx)}
              compact
            />
          ))}

          {/* Add Filter Button */}
          <AddFilterDropdown clauses={clauses} onAdd={addClause} />
        </div>
      </div>
    </div>
  )
}
