/**
 * LibrarySearchPrototype — /prototype/library-search
 *
 * Three radically different approaches to the Library's search panel,
 * all powered by the same shared QueryPalette (see QueryPalette.tsx):
 *
 *   A — Vertical stack palette: clauses always visible as rows.
 *   B — Spotlight palette: a single search input opens a dropdown
 *       of clauses; arrow keys navigate between them.
 *   C — Card stack palette: each clause is a tall card; click to
 *       expand its combobox inline.
 *
 * All three compose the same WQL via `clausesToWql(clauses)`. The
 * difference is purely presentation — pick one and graduate it to
 * the real Library route.
 */
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantC } from './VariantC'
import { type QueryClause, clausesToWql, defaultClauses } from './queryClauses'

const VARIANTS = [
  { key: 'A', label: 'Vertical stack palette' },
  { key: 'B', label: 'Spotlight palette' },
  { key: 'C', label: 'Card stack palette' },
] as const

export function LibrarySearchPrototype() {
  const [searchParams, setSearchParams] = useSearchParams()
  const variant = (searchParams.get('variant') ?? 'A').toUpperCase()
  const [clauses, setClauses] = useState<QueryClause[]>(defaultClauses())

  const wql = useMemo(() => clausesToWql(clauses), [clauses])

  const cycle = (dir: number) => {
    const idx = VARIANTS.findIndex(v => v.key === variant)
    const next = VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length]
    setSearchParams({ variant: next.key }, { replace: true })
  }

  // Keyboard cycling for variants (← / →)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return
      if (e.key === 'ArrowLeft') cycle(-1)
      if (e.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [variant])

  const currentLabel = VARIANTS.find(v => v.key === variant)?.label ?? variant

  return (
    <div className="flex flex-col flex-1 bg-muted/30" data-testid="library-search-prototype">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border bg-background">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-black text-foreground">Library Search — Palette Prototype</h1>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Throwaway · /prototype/library-search</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Use ← / → to cycle variants. Each is a different presentation of the same shared query palette.
        </p>
      </div>

      {/* The variable panel */}
      {variant === 'A' && <VariantA clauses={clauses} onChange={setClauses} />}
      {variant === 'B' && <VariantB clauses={clauses} onChange={setClauses} />}
      {variant === 'C' && <VariantC clauses={clauses} onChange={setClauses} />}
      {variant !== 'A' && variant !== 'B' && variant !== 'C' && <VariantA clauses={clauses} onChange={setClauses} />}

      {/* WQL readout */}
      <div className="px-6 py-1.5 bg-muted/40 border-b border-border">
        <code className="font-mono text-[10px] text-muted-foreground">{wql}</code>
      </div>

      {/* Floating variant switcher */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-border bg-background/95 backdrop-blur shadow-lg px-4 py-2">
        <button type="button" onClick={() => cycle(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-bold">
          <span className="text-primary">{variant}</span> — {currentLabel}
        </span>
        <button type="button" onClick={() => cycle(1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
