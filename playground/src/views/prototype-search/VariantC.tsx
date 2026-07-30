/**
 * Variant C — "Card stack"
 *
 * Each clause is a tall card. The active card expands to show its
 * suggestion dropdown; other cards collapse to a compact summary.
 * Up/Down moves between cards. Clicking a card activates it.
 *
 * Structurally different from A (vertical stack) and B (spotlight):
 * generous spacing, larger type, clear sense of each clause as a
 * distinct thing.
 */
import { useState } from 'react'
import { ClauseRow } from './QueryPalette'
import { type QueryClause, type ClauseType, CLAUSE_META } from './queryClauses'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function VariantC({ clauses, onChange }: { clauses: QueryClause[]; onChange: (c: QueryClause[]) => void }) {
  const [activeIdx, setActiveIdx] = useState(0)

  return (
    <div className="border-b border-border bg-background px-6 py-4" data-testid="variant-c">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">C — Card stack</span>
        <span className="text-[10px] text-muted-foreground/40">click a card · ↑↓ to navigate</span>
      </div>
      <div className="space-y-2 max-w-2xl">
        {clauses.map((clause, idx) => {
          const isActive = idx === activeIdx
          const meta = CLAUSE_META[clause.type]
          return (
            <div
              key={clause.id}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                'rounded-xl border transition-all cursor-pointer',
                isActive
                  ? 'border-primary/50 bg-background shadow-md ring-1 ring-primary/20'
                  : 'border-border bg-muted/30 hover:bg-background hover:border-border/70',
              )}
              data-testid={`variant-c-card-${clause.type}`}
            >
              {/* Card header: always visible */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{meta.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      {meta.label}
                    </span>
                    {clause.value && (
                      <span className="text-sm font-semibold text-foreground">
                        {clause.value}
                      </span>
                    )}
                  </div>
                  {!isActive && clause.value && (
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                      Click to edit
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onChange(clauses.filter((_, i) => i !== idx)) }}
                  className="size-6 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
              {/* Expanded: combobox */}
              {isActive && (
                <div className="border-t border-border/50 px-4 py-3" onClick={e => e.stopPropagation()}>
                  <ClauseRow
                    clause={clause}
                    isActive={true}
                    onFocus={() => setActiveIdx(idx)}
                    onChange={patch => onChange(clauses.map((c, i) => i === idx ? { ...c, ...patch } : c))}
                    onRemove={() => {
                      const next = clauses.filter((_, i) => i !== idx)
                      onChange(next.length ? next : [{ id: 'source', type: 'source', ...CLAUSE_META.source, value: 'Notes' }])
                      setActiveIdx(0)
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
        <AddClauseCard onAdd={(type) => {
          const meta = CLAUSE_META[type]
          const newClause: QueryClause = {
            id: `c-${Date.now()}-${Math.random()}`,
            type,
            label: meta.label,
            value: '',
            inputType: meta.inputType,
            placeholder: meta.placeholder,
          }
          onChange([...clauses, newClause])
          setActiveIdx(clauses.length)
        }} />
      </div>
    </div>
  )
}

function AddClauseCard({ onAdd }: { onAdd: (type: 'text' | 'catalog' | 'tag' | 'effort' | 'discipline' | 'time') => void }) {
  const [open, setOpen] = useState(false)
  const available = (['text', 'catalog', 'tag', 'effort', 'discipline', 'time'] as const)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/30 hover:border-primary/30 hover:text-primary transition-colors"
      >
        <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center">
          <Plus className="size-3" />
        </span>
        Add clause
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 left-0 right-0 rounded-md border border-border bg-background shadow-lg py-1">
            {available.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { onAdd(t); setOpen(false) }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
              >
                <span className="text-base">{CLAUSE_META[t as ClauseType].icon}</span>
                <span className="font-medium">{CLAUSE_META[t as ClauseType].label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
