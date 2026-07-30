/**
 * WqlComposerPanel — the Library's sticky search header (#808 iteration, feeds #809).
 *
 * Visually composes a WQL query from UI controls, and renders a live preview
 * of the resulting `find:block{...} in <scope> <range>` string so the user
 * can see what they're asking for. Read-only prototype state (in-memory only).
 *
 * Controls:
 *   - 3 source tri-state toggles (Note / Session / Post) — include / hide / neutral
 *   - Free-text box → maps to `{text:<q>}`
 *   - Datadog-style time range (presets + custom absolute range)
 *   - "+ Add filter" menu — context-aware (Catalog when Sessions visible, etc.)
 *   - Active filter chips (removable)
 *   - Live WQL preview line (debug-gated raw editor stubbed)
 *
 * The panel calls `onChange` with the composed state on every edit; the host
 * (Variant A) applies it to the visible entries.
 */
import { useMemo, useState, useRef, useEffect } from 'react'
import { SearchIcon, ClockIcon, PlusIcon, XIcon, ChevronDownIcon, CodeIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

export type TriState = 'neutral' | 'include' | 'hide'
export type SourceKey = 'note' | 'session' | 'post'

export interface CatalogFilter {
  key: 'catalog' | 'tag' | 'effort' | 'discipline'
  value: string
}

export type TimePreset =
  | '1d' | '3d' | '1w' | '2w' | '4w' | '12w' | '26w' | '52w' | 'all' | 'custom'

export interface PanelState {
  sources: Record<SourceKey, TriState>
  text: string
  timePreset: TimePreset
  customStart?: string
  customEnd?: string
  filters: CatalogFilter[]
}

export const DEFAULT_PANEL_STATE: PanelState = {
  sources: { note: 'include', session: 'include', post: 'include' },
  text: '',
  timePreset: '2w',
  filters: [],
}

export interface WqlComposerPanelProps {
  state: PanelState
  onChange: (next: PanelState) => void
  /** Catalog ids available for the Catalog filter (Sessions source). */
  catalogs: { id: string; name: string }[]
  className?: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const TIME_PRESETS: { key: TimePreset; label: string; wql: string }[] = [
  { key: '1d', label: 'Past day', wql: 'last 1d' },
  { key: '3d', label: 'Past 3 days', wql: 'last 3d' },
  { key: '1w', label: 'Past week', wql: 'last 1w' },
  { key: '2w', label: 'Past 2 weeks', wql: 'last 2w' },
  { key: '4w', label: 'Past month', wql: 'last 4w' },
  { key: '12w', label: 'Past 3 months', wql: 'last 12w' },
  { key: '26w', label: 'Past 6 months', wql: 'last 26w' },
  { key: '52w', label: 'Past year', wql: 'last 52w' },
  { key: 'all', label: 'All time', wql: '' },
  { key: 'custom', label: 'Custom…', wql: '' },
]

const SOURCE_LABELS: Record<SourceKey, string> = {
  note: 'Note',
  session: 'Session',
  post: 'Post',
}

// ── Component ──────────────────────────────────────────────────────────────

export function WqlComposerPanel({ state, onChange, catalogs, className }: WqlComposerPanelProps) {
  const cycleSource = (key: SourceKey) => {
    const order: TriState[] = ['neutral', 'include', 'hide']
    const current = state.sources[key]
    const next = order[(order.indexOf(current) + 1) % order.length]
    onChange({ ...state, sources: { ...state.sources, [key]: next } })
  }

  const setText = (text: string) => onChange({ ...state, text })
  const setTimePreset = (timePreset: TimePreset) => onChange({ ...state, timePreset })
  const setCustomRange = (customStart: string, customEnd: string) =>
    onChange({ ...state, timePreset: 'custom', customStart, customEnd })
  const addFilter = (f: CatalogFilter) => onChange({ ...state, filters: [...state.filters, f] })
  const removeFilter = (idx: number) =>
    onChange({ ...state, filters: state.filters.filter((_, i) => i !== idx) })

  return (
    <div
      className={cn('sticky top-0 z-[20] bg-background/95 backdrop-blur border-b border-border', className)}
      data-testid="wql-composer-panel"
    >
      {/* Row 1 — primary controls */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-2.5">
        {/* Source tri-state toggles */}
        <div className="flex items-center gap-1.5" data-testid="source-toggles">
          {(Object.keys(SOURCE_LABELS) as SourceKey[]).map(key => (
            <SourceToggle
              key={key}
              label={SOURCE_LABELS[key]}
              state={state.sources[key]}
              onClick={() => cycleSource(key)}
            />
          ))}
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Free-text */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={state.text}
            onChange={e => setText(e.target.value)}
            placeholder="Search content — maps to {text:…}"
            className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="panel-text-input"
          />
        </div>

        {/* Time range */}
        <TimeRangeSelect
          preset={state.timePreset}
          customStart={state.customStart}
          customEnd={state.customEnd}
          onPreset={setTimePreset}
          onCustom={setCustomRange}
        />

        {/* Add filter */}
        <AddFilterMenu
          state={state}
          catalogs={catalogs}
          onAdd={addFilter}
        />

        {/* Debug raw-toggle stub (per #809: debug-gated). Always visible here as a hint. */}
        <button
          type="button"
          className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Raw query (debug mode)"
          data-testid="panel-raw-toggle"
        >
          <CodeIcon className="size-3.5" />
        </button>
      </div>

      {/* Row 2 — resolved range + active chips + WQL preview */}
      <div className="px-6 pb-2 flex flex-wrap items-center gap-2 text-[11px]">
        <ResolvedRange state={state} />

        {state.filters.map((f, idx) => (
          <FilterChip
            key={`${f.key}:${f.value}`}
            filter={f}
            onRemove={() => removeFilter(idx)}
          />
        ))}

        {/* WQL preview — the visual representation of "what it is" */}
        <div className="ml-auto flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
            WQL
          </span>
          <code className="font-mono text-[11px] text-foreground/80 bg-muted/60 rounded px-1.5 py-0.5 truncate max-w-[420px]" data-testid="wql-preview">
            {composeWql(state)}
          </code>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SourceToggle({ label, state, onClick }: { label: string; state: TriState; onClick: () => void }) {
  const styles: Record<TriState, string> = {
    neutral: 'border-border bg-transparent text-muted-foreground hover:bg-muted/50',
    include: 'border-primary bg-primary/10 text-primary font-bold',
    hide: 'border-border bg-transparent text-muted-foreground/40 line-through',
  }
  const dot: Record<TriState, string> = {
    neutral: '⊙',
    include: '●',
    hide: '○',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label}: ${state} (click to cycle)`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
        styles[state],
      )}
      data-testid={`source-toggle-${label.toLowerCase()}`}
    >
      <span className="text-[10px] leading-none">{dot[state]}</span>
      {label}
    </button>
  )
}

function TimeRangeSelect({
  preset,
  customStart,
  customEnd,
  onPreset,
  onCustom,
}: {
  preset: TimePreset
  customStart?: string
  customEnd?: string
  onPreset: (p: TimePreset) => void
  onCustom: (start: string, end: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const current = TIME_PRESETS.find(p => p.key === preset)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-muted/50 transition-colors"
        data-testid="time-range-button"
      >
        <ClockIcon className="size-3.5 text-muted-foreground" />
        <span>{current?.label ?? 'Custom'}</span>
        <ChevronDownIcon className="size-3 text-muted-foreground" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-64 rounded-md border border-border bg-background shadow-lg z-30 p-1"
          data-testid="time-range-menu"
        >
          {TIME_PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                onPreset(p.key)
                // Keep the menu open when Custom is picked so the date
                // pickers are reachable; close for any other preset.
                if (p.key !== 'custom') setOpen(false)
              }}
              className={cn(
                'block w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted/60 transition-colors',
                p.key === preset && 'bg-primary/10 text-primary font-bold',
              )}
            >
              {p.label}
            </button>
          ))}

          {preset === 'custom' && (
            <div className="mt-1 pt-1 border-t border-border px-1.5 py-1.5 space-y-1.5" data-testid="custom-range">
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStart ?? ''}
                  onChange={e => onCustom(e.target.value, customEnd ?? '')}
                  className="flex-1 rounded border border-border bg-background px-1.5 py-1 text-[11px]"
                  aria-label="Start date"
                />
                <span className="text-muted-foreground text-[11px]">→</span>
                <input
                  type="date"
                  value={customEnd ?? ''}
                  onChange={e => onCustom(customStart ?? '', e.target.value)}
                  className="flex-1 rounded border border-border bg-background px-1.5 py-1 text-[11px]"
                  aria-label="End date"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddFilterMenu({
  state,
  catalogs,
  onAdd,
}: {
  state: PanelState
  catalogs: { id: string; name: string }[]
  onAdd: (f: CatalogFilter) => void
}) {
  const [open, setOpen] = useState(false)
  const [catalogPicker, setCatalogPicker] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCatalogPicker(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Context-aware: Catalog filter only when Sessions aren't hidden.
  const sessionVisible = state.sources.session !== 'hide'
  const postVisible = state.sources.post !== 'hide'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        data-testid="add-filter-button"
      >
        <PlusIcon className="size-3.5" />
        Filter
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-md border border-border bg-background shadow-lg z-30 p-1" data-testid="add-filter-menu">
          {/* Catalog — only when Sessions are visible */}
          {sessionVisible && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setCatalogPicker(p => !p)}
                className="flex items-center justify-between w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted/60 transition-colors"
              >
                <span>Catalog</span>
                <ChevronDownIcon className="size-3" />
              </button>
              {catalogPicker && (
                <div className="ml-2 mb-1 max-h-48 overflow-y-auto border-l border-border pl-1.5" data-testid="catalog-picker">
                  {catalogs.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onAdd({ key: 'catalog', value: c.id })
                        setOpen(false)
                        setCatalogPicker(false)
                      }}
                      className="block w-full text-left px-1.5 py-1 text-[11px] rounded hover:bg-muted/60 transition-colors truncate"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tag — always available */}
          <button
            type="button"
            onClick={() => {
              const v = window.prompt('Tag value (e.g. pr, benchmark)')
              if (v) onAdd({ key: 'tag', value: v })
              setOpen(false)
            }}
            className="block w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted/60 transition-colors"
          >
            Tag…
          </button>

          {/* Effort — always available */}
          <button
            type="button"
            onClick={() => {
              const v = window.prompt('Effort slug (e.g. thruster, burpee)')
              if (v) onAdd({ key: 'effort', value: v })
              setOpen(false)
            }}
            className="block w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted/60 transition-colors"
          >
            Effort…
          </button>

          {/* Discipline — always available */}
          <button
            type="button"
            onClick={() => {
              const v = window.prompt('Discipline (e.g. strength, monostructural)')
              if (v) onAdd({ key: 'discipline', value: v })
              setOpen(false)
            }}
            className="block w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted/60 transition-colors"
          >
            Discipline…
          </button>

          {!sessionVisible && !postVisible && (
            <div className="px-2.5 py-1.5 text-[10px] text-muted-foreground/60">
              More filters appear when more sources are visible.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({ filter, onRemove }: { filter: CatalogFilter; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/[0.06] px-1.5 py-0.5 text-[10px]">
      <span className="text-[9px] uppercase tracking-wide text-amber-600/80">{filter.key}</span>
      <span className="font-mono text-amber-700">{filter.value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-amber-600/60 hover:text-amber-700"
        aria-label={`Remove ${filter.key}:${filter.value}`}
      >
        <XIcon className="size-2.5" />
      </button>
    </span>
  )
}

function ResolvedRange({ state }: { state: PanelState }) {
  const { start, end, label } = useMemo(() => resolveRange(state), [state])
  if (!start && !end && state.timePreset === 'all') {
    return <span className="text-muted-foreground/70 font-medium">All time</span>
  }
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <span className="text-muted-foreground/70 font-medium" data-testid="resolved-range">
      {label}: <span className="tabular-nums">{fmt(start)}</span>
      <span className="mx-1 text-muted-foreground/40">→</span>
      <span className="tabular-nums">{fmt(end)}</span>
    </span>
  )
}

// ── Composition ────────────────────────────────────────────────────────────

function resolveRange(state: PanelState): { start: Date; end: Date; label: string } {
  const now = new Date()
  const end = now
  if (state.timePreset === 'custom' && state.customStart && state.customEnd) {
    return {
      start: new Date(state.customStart + 'T00:00:00'),
      end: new Date(state.customEnd + 'T23:59:59'),
      label: 'Custom',
    }
  }
  const days: Partial<Record<TimePreset, number>> = {
    '1d': 1, '3d': 3, '1w': 7, '2w': 14, '4w': 28, '12w': 84, '26w': 182, '52w': 364,
  }
  const d = days[state.timePreset]
  if (d !== undefined) {
    const start = new Date(now)
    start.setDate(start.getDate() - d)
    return { start, end, label: `Past ${state.timePreset}` }
  }
  // all
  const start = new Date(2000, 0, 1)
  return { start, end, label: 'All time' }
}

/** Compose the WQL string the panel currently represents. Pure. */
export function composeWql(state: PanelState): string {
  // Scope: derive from source tri-states.
  // include-only sources define `in <scope>`; hide excludes; neutral is implicit.
  const scopes: string[] = []
  if (state.sources.note !== 'hide') scopes.push('journal')
  if (state.sources.session !== 'hide') scopes.push('collections')
  if (state.sources.post !== 'hide') scopes.push('feeds')
  const scope = scopes.length === 0 ? 'none' : scopes.length === 3 ? 'all' : scopes.join(',')

  // Filters
  const filterParts: string[] = []
  if (state.text.trim()) filterParts.push(`text:${state.text.trim()}`)
  for (const f of state.filters) filterParts.push(`${f.key}:${f.value}`)
  const filterStr = filterParts.length ? `{${filterParts.join(', ')}}` : ''

  // Time range
  const preset = TIME_PRESETS.find(p => p.key === state.timePreset)
  let rangeStr = preset?.wql ?? ''
  if (state.timePreset === 'custom' && state.customStart && state.customEnd) {
    rangeStr = `from ${state.customStart} to ${state.customEnd}`
  }

  return `find:block${filterStr} in ${scope}${rangeStr ? ' ' + rangeStr : ''}`.trim()
}
