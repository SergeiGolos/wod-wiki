/**
 * Variant B — "Spotlight palette"
 *
 * A single search input dominates. The clauses are tucked *inside*
 * the input's dropdown — typing opens a list of clauses the user can
 * navigate with up/down. The active clause expands inline to show
 * its combobox. Escape or click-outside closes.
 *
 * Structurally different from A and C: one input, all clauses below
 * it in a dropdown. Like Raycast / Spotlight.
 */
import { useState, useRef, useEffect } from 'react'
import { Search as SearchIcon, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClauseRow } from './QueryPalette'
import { type QueryClause, CLAUSE_META } from './queryClauses'

export function VariantB({ clauses, onChange }: { clauses: QueryClause[]; onChange: (c: QueryClause[]) => void }) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i: number) => Math.min(i + 1, clauses.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i: number) => Math.max(i - 1, 0)) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, clauses.length])

  // Click outside closes
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="border-b border-border bg-background px-6 py-3 relative" data-testid="variant-b">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">B — Spotlight</span>
        <span className="text-[10px] text-muted-foreground/40">click to open · ↑↓ between clauses · Esc to close</span>
      </div>
      <div ref={containerRef} className="relative max-w-2xl">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={cn(
            'w-full flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm transition-colors',
            open && 'border-primary/40 bg-background',
          )}
        >
          <SearchIcon className="size-4 text-muted-foreground" />
          <span className="flex-1 text-left text-muted-foreground">
            {clauses.length === 0 ? 'Search the library…' : (
              <span className="flex flex-wrap gap-1">
                {clauses.map((c, i) => (
                  <span key={c.id} className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-medium',
                    i === activeIdx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {CLAUSE_META[c.type].label}{c.value ? `: ${c.value}` : ''}
                  </span>
                ))}
              </span>
            )}
          </span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-30 top-full left-0 right-0 mt-2 rounded-xl border border-border bg-background shadow-2xl py-2 max-h-[60vh] overflow-y-auto">
            <div className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/50 mb-1">
              Query clauses — ↑↓ to navigate
            </div>
            {clauses.map((clause, idx) => (
              <div
                key={clause.id}
                onClick={() => setActiveIdx(idx)}
                className={cn(
                  'px-2',
                  idx === activeIdx && 'bg-primary/5',
                )}
                data-testid={`variant-b-row-${clause.type}`}
              >
                <ClauseRow
                  clause={clause}
                  isActive={idx === activeIdx}
                  onFocus={() => setActiveIdx(idx)}
                  onChange={patch => onChange(clauses.map((c, i) => i === idx ? { ...c, ...patch } : c))}
                  onRemove={() => {
                    const next = clauses.filter((_, i) => i !== idx)
                    onChange(next.length ? next : [{ id: 'source', type: 'source', ...CLAUSE_META.source, value: 'Notes' }])
                    setActiveIdx(0)
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
