/**
 * Variant B2 — Natural Language Guided Prompt (Fill-in-the-Blanks Spotlight)
 *
 * Formats the query as a calm, natural language sentence inside the search bar.
 * Empty slots show dimmed placeholder prompts.
 *
 * Keyboard: Tab / Shift+Tab to jump between sentence slots, ↑ / ↓ to select.
 */
import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { TokenSlotPill, AddFilterDropdown } from '@/components/organisms/wql-composer/QueryPalette'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
} from '@/components/organisms/wql-composer'
export function VariantB({
  clauses,
  onChange,
}: {
  clauses: QueryClause[]
  onChange: (c: QueryClause[]) => void
}) {
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null)

  const updateClause = (idx: number, patch: Partial<QueryClause>) => {
    onChange(clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const removeClause = (idx: number) => {
    onChange(clauses.filter((_, i) => i !== idx))
  }

  const addClause = (type: string) => {
    const meta = CLAUSE_META[type as ClauseType]
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

  const sourceIdx = clauses.findIndex(c => c.type === 'source')
  const timeIdx = clauses.findIndex(c => c.type === 'time')
  const whereIdx = clauses.findIndex(c => c.type === 'where')

  const HEAD_TYPES: Record<string, true> = {
    source: true,
    time: true,
    where: true,
    agg: true,
    metric: true,
    groupby: true,
    rollup: true,
    unit: true,
  }
  const filterClauses = clauses.map((c, idx) => ({ clause: c, idx })).filter(item => !HEAD_TYPES[item.clause.type])

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur px-6 py-3" data-testid="variant-b2">
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-1.5 flex items-center justify-between">
        <span>B2 — Natural Language Guided Prompt (Fill-in-the-Blanks Spotlight)</span>
        <span className="text-[9px] font-normal text-muted-foreground/50">Tab / Shift+Tab between sentence blanks · ↑↓ to choose</span>
      </div>

      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 min-h-[46px] rounded-xl border border-border bg-muted/20 px-4 py-2 text-xs font-medium transition-all shadow-xs leading-relaxed">
          <SearchIcon className="size-4 text-muted-foreground/60 shrink-0 mr-1" />

          <span className="text-muted-foreground font-medium">Find</span>

          {/* Source Slot */}
          {sourceIdx >= 0 && (
            <TokenSlotPill
              clause={clauses[sourceIdx]}
              isActive={activeSlotIdx === sourceIdx}
              onClick={() => setActiveSlotIdx(sourceIdx)}
              onChange={patch => updateClause(sourceIdx, patch)}
              placeholderOverride="[notes, blocks, metrics…]"
              compact
            />
          )}

          <span className="text-muted-foreground font-medium">matching</span>
          <span className="text-muted-foreground font-medium">matching</span>
          {filterClauses.length === 0 && (
            <span className="text-muted-foreground/40 italic font-mono text-[11px]">[any text / tags]</span>
          )}
          {filterClauses.map(({ clause, idx }) => (
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

          <span className="text-muted-foreground font-medium">within</span>

          {/* Time Window Slot */}
          {timeIdx >= 0 && (
            <TokenSlotPill
              clause={clauses[timeIdx]}
              isActive={activeSlotIdx === timeIdx}
              onClick={() => setActiveSlotIdx(timeIdx)}
              onChange={patch => updateClause(timeIdx, patch)}
              placeholderOverride="[time window]"
              compact
            />
          )}

          {/* Optional Metric Join */}
          {whereIdx >= 0 && (
            <>
              <span className="text-muted-foreground font-medium">where</span>
              <TokenSlotPill
                clause={clauses[whereIdx]}
                isActive={activeSlotIdx === whereIdx}
                onClick={() => setActiveSlotIdx(whereIdx)}
                onChange={patch => updateClause(whereIdx, patch)}
                onRemove={() => removeClause(whereIdx)}
                placeholderOverride="[metric predicate]"
                compact
              />
            </>
          )}

          <AddFilterDropdown clauses={clauses} onAdd={addClause} />
        </div>
      </div>
    </div>
  )
}
