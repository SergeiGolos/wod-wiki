/**
 * LibrarySearchPrototype — /prototype/library-search
 *
 * Three radically different approaches to the Library's search panel:
 *   A — Source Tabs + Guided Filters (tab-driven, context-aware)
 *   B — Smart Search Bar + Faceted Refine (search-first, popover)
 *   C — Query Builder Cards (additive visual query builder)
 *
 * Throwaway prototype — delete after picking one.
 */
import { useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantC } from './VariantC'
import { type SearchState, DEFAULT_SEARCH_STATE, composeSearchWql, SOURCE_META } from './shared'
import { queryService } from '@/services/analytics/query'
import { parseQuery, isFindQuery, type ParsedFindQuery } from '@/services/analytics/query/wql'
import { toEntry, type Entry } from '../../lib/entryMapper'

const VARIANTS = [
  { key: 'A', label: 'Source Tabs + Guided Filters' },
  { key: 'B', label: 'Smart Search + Faceted Refine' },
  { key: 'C', label: 'Query Builder Cards' },
] as const

export function LibrarySearchPrototype() {
  const [searchParams, setSearchParams] = useSearchParams()
  const variant = (searchParams.get('variant') ?? 'A').toUpperCase()
  const [state, setState] = useState<SearchState>(DEFAULT_SEARCH_STATE)
  const [entries, setEntries] = useState<Entry[]>([])

  const wql = useMemo(() => composeSearchWql(state), [state])

  useEffect(() => {
    let cancelled = false
    const parsed = parseQuery(wql)
    if (!isFindQuery(parsed) || parsed.error) {
      if (!cancelled) setEntries([])
      return
    }
    queryService.runFind(parsed as ParsedFindQuery).then(result => {
      if (!cancelled) setEntries(result.notes.map(toEntry))
    }).catch(() => { if (!cancelled) setEntries([]) })
    return () => { cancelled = true }
  }, [wql])

  const cycle = (dir: number) => {
    const idx = VARIANTS.findIndex(v => v.key === variant)
    const next = VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length]
    setSearchParams({ variant: next.key }, { replace: true })
  }

  // Keyboard cycling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
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
          <h1 className="text-base font-black text-foreground">Library Search — Prototype</h1>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Throwaway · /prototype/library-search</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Three approaches to the search panel. Use ← / → to cycle. Each picks ONE source (not tri-state).
        </p>
      </div>

      {/* The variable panel */}
      {variant === 'A' && <VariantA state={state} onChange={setState} />}
      {variant === 'B' && <VariantB state={state} onChange={setState} />}
      {variant === 'C' && <VariantC state={state} onChange={setState} />}
      {variant !== 'A' && variant !== 'B' && variant !== 'C' && <VariantA state={state} onChange={setState} />}

      {/* WQL readout (debug only) */}
      <div className="px-6 py-1.5 bg-muted/40 border-b border-border">
        <code className="font-mono text-[10px] text-muted-foreground">{wql}</code>
        <span className="ml-2 text-[10px] text-muted-foreground/50">→ {entries.length} entries</span>
      </div>

      {/* Entry list (simplified — just titles + kinds) */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 && (
          <div className="px-6 py-12 text-center text-muted-foreground/50 text-sm">No entries match.</div>
        )}
        {entries.slice(0, 50).map(entry => (
          <div key={entry.id} className="flex items-center gap-3 px-6 py-2 hover:bg-muted/30 border-b border-border/50">
            <span className="text-lg">{SOURCE_META[entry.kind === 'note' ? 'note' : entry.kind === 'session' ? 'session' : 'post'].icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{entry.title}</span>
              {entry.subtitle && <span className="ml-2 text-[10px] text-muted-foreground/60">{entry.subtitle}</span>}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
              {entry.kind}
            </span>
            {entry.date && <span className="text-[10px] text-muted-foreground/50 tabular-nums">{entry.date}</span>}
          </div>
        ))}
        {entries.length > 50 && (
          <div className="px-6 py-3 text-center text-xs text-muted-foreground/50">+ {entries.length - 50} more…</div>
        )}
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
