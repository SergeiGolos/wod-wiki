/**
 * Variant B — "Smart Search Bar + Faceted Refine"
 *
 * A prominent search bar dominates the top (Google-style). Below it,
 * a compact source indicator (pill) and a "Refine" button that opens
 * a popover with structured filter options. The popover is the only
 * place the user adjusts structured filters — the bar is for text only.
 *
 * Structure: search-first, faceted, popover-driven. The source pill
 * is a single-click cycle (Note → Session → Post → Note).
 */
import { useState } from 'react'
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react'
import {
  type SearchState,
  type SearchSource,
  SOURCE_META,
} from './shared'
import { cn } from '@/lib/utils'
export function VariantB({ state, onChange }: { state: SearchState; onChange: (s: SearchState) => void }) {
  const [refineOpen, setRefineOpen] = useState(false)
  const meta = SOURCE_META[state.source]

  const cycleSource = () => {
    const sources: SearchSource[] = ['note', 'session', 'post']
    const next = sources[(sources.indexOf(state.source) + 1) % sources.length]
    onChange({ ...state, source: next, filters: [] })
  }

  const setText = (text: string) => onChange({ ...state, text })
  const removeFilter = (idx: number) =>
    onChange({ ...state, filters: state.filters.filter((_, i) => i !== idx) })

  return (
    <div className="border-b border-border bg-background" data-testid="variant-b">
      {/* Big search bar */}
      <div className="px-6 py-3">
        <div className="relative max-w-2xl mx-auto">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={state.text}
            onChange={e => setText(e.target.value)}
            placeholder={`Search ${meta.label.toLowerCase()} — by title, movement, or description…`}
            className="w-full rounded-xl border border-border bg-muted/30 py-2 pl-10 pr-32 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 transition-all"
            data-testid="smart-search-input"
          />
          {/* Source pill + Refine button inside the bar */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={cycleSource}
              className="rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 hover:bg-primary/20 transition-colors"
              title="Click to cycle source"
            >
              {meta.icon} {meta.label}
            </button>
            <button
              type="button"
              onClick={() => setRefineOpen(o => !o)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors',
                refineOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <SlidersHorizontal className="size-3" />
              Refine
            </button>
          </div>
        </div>
      </div>

      {/* Refine popover */}
      {refineOpen && (
        <RefinePopover state={state} onChange={onChange} />
      )}

      {/* Active filter chips (inline, subtle) */}
      {state.filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-6 pb-2 max-w-2xl mx-auto">
          {state.filters.map((f, idx) => (
            <button
              key={`${f.key}:${f.value}:${idx}`}
              type="button"
              onClick={() => removeFilter(idx)}
              className="inline-flex items-center gap-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5 hover:bg-muted/80 transition-colors"
            >
              {f.label}: {f.value}
              <X className="size-2.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RefinePopover({ state, onChange }: { state: SearchState; onChange: (s: SearchState) => void }) {
  const addFilter = (key: string, label: string, value: string) =>
    onChange({ ...state, filters: [...state.filters.filter(f => f.key !== key), { key, label, value }] })

  return (
    <div className="border-t border-border bg-muted/20 px-6 py-3">
      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3">
        {/* Source — radio */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1.5">Source</div>
          <div className="flex gap-1.5">
            {(Object.keys(SOURCE_META) as SearchSource[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ ...state, source: s, filters: [] })}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                  state.source === s ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {SOURCE_META[s].icon} {SOURCE_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Time range (for dated sources) */}
        {state.source !== 'session' && (
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1.5">When</div>
            <select
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-[11px]"
              onChange={e => addFilter('last', 'When', e.target.value)}
              value={state.filters.find(f => f.key === 'last')?.value ?? ''}
            >
              <option value="">Any time</option>
              <option>Today</option>
              <option>Past week</option>
              <option>Past month</option>
              <option>Past 3 months</option>
            </select>
          </div>
        )}

        {/* Catalog (for sessions) */}
        {state.source === 'session' && (
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1.5">Catalog</div>
            <select
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-[11px]"
              onChange={e => addFilter('catalog', 'Catalog', e.target.value)}
              value={state.filters.find(f => f.key === 'catalog')?.value ?? ''}
            >
              <option value="">Any catalog</option>
              <option>CrossFit Girls</option>
              <option>Dan John 40-Day</option>
              <option>ZombieFit Dec 2009</option>
            </select>
          </div>
        )}

        {/* Tags (for notes) */}
        {state.source === 'note' && (
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1.5">Tags</div>
            <div className="flex flex-wrap gap-1">
              {['PR', 'Benchmark', 'Competition', 'Heavy'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addFilter('tags', 'Tag', tag)}
                  className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-background border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
