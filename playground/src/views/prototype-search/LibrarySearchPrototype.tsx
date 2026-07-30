/**
 * LibrarySearchPrototype — /prototype/library-search
 *
 * Three space-efficient, visual query builder approaches for Library Search:
 *   - Variant A: Ultra-Compact Filter Pill Bar (Single-line 36px bar)
 *   - Variant B: Embedded Pill Spotlight / Omni-Bar (Command Palette)
 *   - Variant C: Visual Statement Builder (Datadog/Grafana style syntax editor)
 *
 * Evaluates full WQL grammar: targets (note/block), scopes (journal/collections/feeds/all),
 * filters (text, tag, effort, discipline, type, has), time window (last Nw/Nd), and
 * cross-store metric join predicates (where sum:totalVolume{} > 5000).
 */
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Sparkles, Terminal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantC } from './VariantC'
import { type QueryClause, clausesToWql, defaultClauses } from './queryClauses'
import { queryService } from '@/services/analytics/query'
import { parseQuery, isFindQuery, type ParsedFindQuery } from '@/services/analytics/query/wql'
import { toEntry, type Entry } from '../../lib/entryMapper'

const VARIANTS = [
  { key: 'A', label: 'Variant A: Compact Filter Pill Bar' },
  { key: 'B', label: 'Variant B: Embedded Pill Spotlight' },
  { key: 'C', label: 'Variant C: Visual Statement Builder' },
] as const

export function LibrarySearchPrototype() {
  const [searchParams, setSearchParams] = useSearchParams()
  const variant = (searchParams.get('variant') ?? 'A').toUpperCase()
  const [clauses, setClauses] = useState<QueryClause[]>(defaultClauses())
  const [entries, setEntries] = useState<Entry[]>([])
  const [blocks, setBlocks] = useState<any[]>([])
  const [parsed, setParsed] = useState<ParsedFindQuery | null>(null)
  const [stages, setStages] = useState<{ selected: number; matched: number }>({ selected: 0, matched: 0 })
  const [loading, setLoading] = useState(false)

  const wql = useMemo(() => clausesToWql(clauses), [clauses])

  // Live Query Execution against queryService.runFind
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const p = parseQuery(wql)

    if (!isFindQuery(p)) {
      if (!cancelled) {
        setParsed(null)
        setEntries([])
        setBlocks([])
        setLoading(false)
      }
      return
    }

    setParsed(p)

    queryService
      .runFind(p)
      .then(res => {
        if (!cancelled) {
          if (p.target === 'block') {
            setBlocks(res.blocks || [])
            setEntries([])
          } else {
            setEntries((res.notes || []).map(toEntry))
            setBlocks([])
          }
          setStages(res.stages || { selected: 0, matched: 0 })
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([])
          setBlocks([])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [wql])

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
      {/* Top Banner Header */}
      <div className="px-6 py-2.5 border-b border-border bg-background flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-black text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            WQL Visual Query Builder — Prototype Suite
          </h1>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Wayfinder #810
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Use <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">→</kbd> to cycle layout variants
        </div>
      </div>

      {/* The Visual Query Builder Panel Variant */}
      {variant === 'A' && <VariantA clauses={clauses} onChange={setClauses} />}
      {variant === 'B' && <VariantB clauses={clauses} onChange={setClauses} />}
      {variant === 'C' && <VariantC clauses={clauses} onChange={setClauses} />}
      {variant !== 'A' && variant !== 'B' && variant !== 'C' && <VariantA clauses={clauses} onChange={setClauses} />}

      {/* Live WQL & AST Diagnostics Readout */}
      <div className="px-6 py-2 bg-muted/40 border-b border-border flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Terminal className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-[11px] font-semibold text-foreground truncate">{wql}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-[10px] text-muted-foreground">
          {parsed?.error ? (
            <span className="flex items-center gap-1 text-red-500 font-medium">
              <AlertCircle className="size-3" /> Syntax Error
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="size-3" /> Valid WQL
            </span>
          )}
          <span>Target: <strong className="text-foreground">{parsed?.target || 'note'}</strong></span>
          <span>Scope: <strong className="text-foreground">{parsed?.scope || 'journal'}</strong></span>
          {parsed?.last && <span>Window: <strong className="text-foreground">last {parsed.last.size}{parsed.last.unit}</strong></span>}
          {parsed?.join && <span>Join: <strong className="text-purple-600 dark:text-purple-400">{parsed.join.agg}:{parsed.join.metric}{'{}'} {parsed.join.operator} {parsed.join.threshold}</strong></span>}
          <span className="px-2 py-0.5 rounded bg-background border border-border">
            {parsed?.target === 'block' ? `${blocks.length} blocks` : `${entries.length} notes`} (stages: {stages.matched}/{stages.selected})
          </span>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {loading && (
          <div className="py-12 text-center text-xs text-muted-foreground">Executing WQL query...</div>
        )}

        {!loading && parsed?.target === 'block' && blocks.length === 0 && (
          <div className="py-12 text-center text-xs text-muted-foreground/60">No blocks matched this query.</div>
        )}

        {!loading && parsed?.target !== 'block' && entries.length === 0 && (
          <div className="py-12 text-center text-xs text-muted-foreground/60">No notes matched this query.</div>
        )}

        {/* Notes Result List */}
        {!loading && parsed?.target !== 'block' && entries.slice(0, 50).map(entry => (
          <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-background border border-border hover:border-border/80 transition-colors shadow-xs">
            <span className="text-lg shrink-0">
              {entry.kind === 'note' ? '📝' : entry.kind === 'session' ? '💪' : '📅'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground truncate">{entry.title}</span>
                {entry.subtitle && <span className="text-[10px] text-muted-foreground/60 truncate">{entry.subtitle}</span>}
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {entry.kind}
            </span>
            {entry.date && <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{entry.date}</span>}
          </div>
        ))}

        {/* Blocks Result List */}
        {!loading && parsed?.target === 'block' && blocks.slice(0, 50).map((block, idx) => (
          <div key={block.blockContentId || idx} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-background border border-border hover:border-border/80 transition-colors shadow-xs">
            <span className="text-lg shrink-0">📦</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground truncate">{block.noteTitle || 'Block'}</span>
                <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  {block.dataType}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">{block.rawContent}</p>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              {block.sourceId || 'journal'}
            </span>
          </div>
        ))}
      </div>

      {/* Floating Variant Switcher Pill */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-border bg-background/95 backdrop-blur shadow-xl px-4 py-2">
        <button type="button" onClick={() => cycle(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-bold">
          <span className="text-amber-500 font-black">{variant}</span> — {currentLabel}
        </span>
        <button type="button" onClick={() => cycle(1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
