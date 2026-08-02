/**
 * QueryPalette — Shared building blocks for Spotlight Query Builders.
 *
 * Provides:
 *   - TokenSlotPill: Interactive token slot pill with Tab/Shift+Tab navigation and Up/Down selection.
 *   - ClausePopover: Inline editor popover with keyboard arrow navigation.
 *   - AddFilterDropdown: Menu to add new query filter slots.
 */
import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import { Plus, X, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { composerRegistry, useComposerSlots, type CustomSlotDefinition } from './ComposerRegistry'
import { useSuggestions } from './useSuggestions'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
  getClauseMeta,
  clauseValue,
  sourcePlane,
  SOURCE_OPTIONS,
  TIME_OPTIONS,
  AGG_OPTIONS,
  ROLLUP_OPTIONS,
  GROUPBY_OPTIONS,
  METRIC_OPTIONS,
  UNIT_OPTIONS,
  WHERE_AGGREGATORS,
  WHERE_METRICS,
  WHERE_OPERATORS,
} from './queryClauses'
import { INTENSITY_TIERS, EFFORT_REGISTRY_ORIGINS } from '@/effort-registry/types'

// ── TokenSlotPill ────────────────────────────────────────────────────────────

export interface TokenSlotPillProps {
  clause: QueryClause
  isActive?: boolean
  /** Flag the pill as the offending slot for a failed parse (issue #832). */
  invalid?: boolean
  /** Error message surfaced inline on the offending pill (tooltip). */
  invalidReason?: string
  onClick?: () => void
  onRemove?: () => void
  onChange?: (patch: Partial<QueryClause>) => void
  compact?: boolean
  placeholderOverride?: string
}

export function TokenSlotPill({
  clause,
  isActive,
  invalid = false,
  invalidReason,
  onClick,
  onRemove,
  onChange,
  compact = false,
  placeholderOverride,
}: TokenSlotPillProps) {
  const meta = getClauseMeta(clause.type)
  const customDef = composerRegistry.getSlot(clause.type)
  const [open, setOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)

  const hasValue = Boolean(clause.value && clause.value.trim())

  // Keydown listener for Tab, Up, Down, Enter, Escape when pill is focused.
  // Handled keys stop at the pill so an embedding container (the palette's
  // result list, issue #834) doesn't double-handle them.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      if (!open) setOpen(true)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(o => !o)
    } else if (e.key === 'Escape') {
      if (!open) return // let the host dismiss
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <div
        ref={pillRef}
        tabIndex={0}
        aria-invalid={invalid || undefined}
        title={invalid ? invalidReason : undefined}
        onClick={() => {
          onClick?.()
          setOpen(o => !o)
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer transition-all select-none focus:outline-none focus:ring-2 focus:ring-primary/40',
          invalid
            ? 'border-red-500/60 bg-red-500/10 text-red-600 ring-1 ring-red-500/30'
            : hasValue
              ? isActive || open
                ? 'border-primary/60 bg-primary/10 text-primary ring-1 ring-primary/30 shadow-xs'
                : 'border-border bg-background hover:bg-muted/50 text-foreground'
              : 'border-dashed border-border/80 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
          compact && 'px-2 py-0.5 text-[11px]',
        )}
        data-testid={`token-slot-${clause.type}`}
      >
        <span className="text-[11px] opacity-70">{meta.icon}</span>

        {hasValue ? (
          <>
            <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground/70">
              {meta.prefix || `${meta.label}:`}
            </span>
            <span className="font-semibold text-foreground truncate max-w-[160px]">
              {clause.value}
            </span>
          </>
        ) : (
          <span className="font-mono text-[11px] opacity-70 italic">
            {placeholderOverride || meta.placeholderText}
          </span>
        )}

        <ChevronDown className="size-3 opacity-40" />

        {onRemove && !NON_REMOVABLE_TYPES.has(clause.type) && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onRemove()
            }}
            className="ml-0.5 rounded p-0.5 hover:bg-red-500/20 hover:text-red-600 transition-colors opacity-60 hover:opacity-100"
            title="Remove filter"
            data-testid={`token-slot-remove-${clause.type}`}
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {open && onChange && (customDef ? (
        <CustomSlotPopover
          clause={clause}
          definition={customDef}
          onClose={() => {
            setOpen(false)
            // Chip hygiene (#854): a placeholder chip that was never filled
            // auto-removes when its popover is dismissed.
            if (!clause.value.trim() && !NON_REMOVABLE_TYPES.has(clause.type)) onRemove?.()
          }}
          onChange={patch => {
            onChange(patch)
            setOpen(false)
          }}
        />
      ) : (
        <ClausePopover
          clause={clause}
          onClose={() => {
            setOpen(false)
            // Chip hygiene (#854): as above.
            if (!clause.value.trim() && !NON_REMOVABLE_TYPES.has(clause.type)) onRemove?.()
          }}
          onChange={patch => {
            onChange(patch)
            setOpen(false)
          }}
        />
      ))}
    </div>
  )
}

// ── ClausePopover: Keyboard-navigable Dropdown ───────────────────────────────

/** Head/required slots that cannot be removed from the pill row. */
const NON_REMOVABLE_TYPES: ReadonlySet<string> = new Set(['source', 'agg', 'metric'])

/** Closed-vocabulary options for static select slots (canonical vocab, #824). */
const STATIC_OPTIONS: Record<string, { value: string; label: string }[]> = {
  source: SOURCE_OPTIONS.map(o => ({ value: o.value, label: `${o.value} — ${o.description}` })),
  time: TIME_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  agg: AGG_OPTIONS,
  rollup: ROLLUP_OPTIONS,
  groupby: GROUPBY_OPTIONS,
  metric: METRIC_OPTIONS,
  unit: UNIT_OPTIONS,
  intensity: INTENSITY_TIERS.map(v => ({ value: v, label: v })),
  origin: EFFORT_REGISTRY_ORIGINS.map(v => ({ value: v, label: v === 'user' ? 'custom' : v })),
}

/** "Nothing here yet" affordance for an empty suggestion list (#831). */
function emptyStateMessage({
  loading,
  itemCount,
  filter,
  binding,
}: {
  loading: boolean
  itemCount: number
  filter: string
  binding?: { open: boolean; emptyText: string }
}): string {
  if (loading) return 'Loading…'
  if (itemCount === 0) return binding?.emptyText ?? 'Nothing here yet'
  if (!filter.trim()) return 'No options'
  const open = binding?.open ?? true
  return open ? 'No matches — press Enter to use the typed value' : 'No matches — no such option'
}

export function ClausePopover({
  clause,
  onClose,
  onChange,
}: {
  clause: QueryClause
  onClose: () => void
  onChange: (patch: Partial<QueryClause>) => void
}) {
  const meta = getClauseMeta(clause.type)
  const [val, setVal] = useState(clause.value)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Focus the filter input when present; otherwise the popover itself so
    // Up/Down + Enter keyboard selection works for target/scope/time slots.
    if (inputRef.current) inputRef.current.focus()
    else popoverRef.current?.focus()
  }, [])

  // Backdrop click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const { items: suggestionItems, loading: suggestionsLoading, binding } = useSuggestions(clause.type)

  // A suggestion binding wins when registered; otherwise static vocab.
  const staticOptions = STATIC_OPTIONS[clause.type]
  const items = binding
    ? suggestionItems.map(s => ({ value: s.value, label: s.label ?? s.value }))
    : (staticOptions ?? suggestionItems.map(s => ({ value: s.value, label: s.label ?? s.value })))

  // Free-text filter input: hidden for closed static selects (Up/Down cycles
  // the full list), shown for metric/unit (typed values also accepted) and
  // freetext/suggestion slots so typed values filter or enter verbatim.
  const showFilterInput = !staticOptions || clause.type === 'metric' || clause.type === 'unit'

  const filteredItems = showFilterInput
    ? items.filter(item => item.value.toLowerCase().includes(val.toLowerCase()) || item.label.toLowerCase().includes(val.toLowerCase()))
    : items

  // Visible commit affordance for typed free text (#854): open slots accept
  // verbatim values, but that used to be keyboard-tribal-knowledge behind a
  // "Nothing here yet" dead-end. Exact matches don't need a duplicate row.
  const typedValue = val.trim()
  const canCommitTyped =
    showFilterInput &&
    typedValue.length > 0 &&
    (binding?.open ?? true) &&
    !filteredItems.some(item => item.value.toLowerCase() === typedValue.toLowerCase())

  // Handled keys stop at the popover so an embedding container (the
  // palette's result list, issue #834) doesn't also navigate/select.
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      setHighlightIdx(i => Math.min(i + 1, Math.max(0, filteredItems.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (filteredItems[highlightIdx]) {
        onChange({ value: filteredItems[highlightIdx].value })
      } else if (val.trim() && (binding?.open ?? true)) {
        // Open slots accept user-typed values not present in the list (#831).
        onChange({ value: val.trim() })
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <div
      ref={popoverRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="absolute top-full left-0 mt-1.5 z-50 min-w-[240px] max-w-[320px] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-2 animate-in fade-in-50 zoom-in-95 focus:outline-none"
      data-testid={`clause-popover-${clause.type}`}
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          <span>{meta.icon}</span> {meta.label}
        </span>
        <span className="text-muted-foreground/50">↑↓ to choose · Enter</span>
      </div>

      {clause.type === 'where' ? (
        <WhereJoinEditor onApply={v => onChange({ value: v })} />
      ) : (
        <div>
          {showFilterInput && (
            <input
              ref={inputRef}
              type="text"
              value={val}
              placeholder={meta.placeholder}
              onChange={e => {
                setVal(e.target.value)
                setHighlightIdx(0)
              }}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary mb-1.5"
            />
          )}

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {canCommitTyped && (
              <button
                type="button"
                onClick={() => onChange({ value: typedValue })}
                className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-md text-left transition-colors hover:bg-muted text-foreground"
                data-testid={`clause-commit-typed-${clause.type}`}
              >
                <span className="truncate">
                  Search for <span className="font-semibold">&ldquo;{typedValue}&rdquo;</span>
                </span>
                <span className="text-muted-foreground/60 ml-1 shrink-0">↵</span>
              </button>
            )}

            {filteredItems.map((item, idx) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange({ value: item.value })}
                className={cn(
                  'flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-md text-left transition-colors',
                  idx === highlightIdx ? 'bg-primary/15 font-semibold text-primary' : 'hover:bg-muted text-foreground',
                )}
              >
                <span className="truncate">{item.label}</span>
                {clause.value === item.value && <Check className="size-3 text-primary shrink-0 ml-1" />}
              </button>
            ))}

            {filteredItems.length === 0 && !canCommitTyped && (
              <div
                className="px-2.5 py-2 text-[11px] italic text-muted-foreground"
                data-testid={`clause-empty-${clause.type}`}
              >
                {emptyStateMessage({
                  loading: suggestionsLoading,
                  itemCount: items.length,
                  filter: val,
                  binding,
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── WhereJoinEditor ─────────────────────────────────────────────────────────

function WhereJoinEditor({ onApply }: { onApply: (wql: string) => void }) {
  const [agg, setAgg] = useState('sum')
  const [metric, setMetric] = useState('totalVolume')
  const [op, setOp] = useState('>')
  const [threshold, setThreshold] = useState('5000')

  const apply = () => {
    onApply(`${agg}:${metric}{} ${op} ${threshold}`)
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground">Aggregator</label>
          <select
            value={agg}
            onChange={e => setAgg(e.target.value)}
            className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs"
          >
            {WHERE_AGGREGATORS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground">Metric</label>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs"
          >
            {WHERE_METRICS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground">Operator</label>
          <select
            value={op}
            onChange={e => setOp(e.target.value)}
            className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs"
          >
            {WHERE_OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground">Threshold</label>
          <input
            type="number"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
            className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs font-mono"
          />
        </div>
      </div>

      <div className="pt-1 flex items-center justify-between border-t border-border/50">
        <code className="text-[10px] font-mono text-muted-foreground">{agg}:{metric}{'{}'} {op} {threshold}</code>
        <button
          type="button"
          onClick={apply}
          className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          Set Join
        </button>
      </div>
    </div>
  )
}

// ── CustomSlotPopover: Popover shell hosting a registered slot's editor ──────

export function CustomSlotPopover({
  clause,
  definition,
  onClose,
  onChange,
}: {
  clause: QueryClause
  definition: CustomSlotDefinition<any>
  onClose: () => void
  onChange: (patch: Partial<QueryClause>) => void
}) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    popoverRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  const { Editor } = definition

  return (
    <div
      ref={popoverRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="absolute top-full left-0 mt-1.5 z-50 min-w-[240px] max-w-[320px] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-2 animate-in fade-in-50 zoom-in-95 focus:outline-none"
      data-testid={`clause-popover-${clause.type}`}
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/50 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          <span>{definition.icon}</span> {definition.label}
        </span>
        <span className="text-muted-foreground/50">Esc to close</span>
      </div>
      <Editor
        value={definition.parseValue(clause.value)}
        onChange={value => onChange({ value: definition.formatValue(value) })}
        onClose={onClose}
      />
    </div>
  )
}

// ── AddFilterDropdown ──────────────────────────────────────────────────────

export function AddFilterDropdown({
  clauses,
  onAdd,
}: {
  clauses: QueryClause[]
  onAdd: (type: string) => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const customSlots = useComposerSlots()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const existingTypes = new Set(clauses.map(c => c.type))
  // Plane-aware vocabulary (issue #838): content planes offer find filters,
  // time, and the metric join; the metrics plane offers analytics filters
  // and the aggregate tail slots.
  const metrics = sourcePlane(clauseValue(clauses, 'source', 'notes')) === 'metrics'
  const efforts = clauseValue(clauses, 'source', 'notes') === 'efforts'
  const available: ClauseType[] = metrics
    ? ['tag', 'effort', 'discipline', 'groupby', 'rollup', 'unit']
    : efforts
      ? ['text', 'effort', 'discipline', 'intensity', 'origin']
      : ['text', 'tag', 'effort', 'discipline', 'catalog', 'type', 'has', 'time', 'where']
  const menuItems: { type: string; icon: string; label: string }[] = [
    ...available.map(type => ({ type, icon: CLAUSE_META[type].icon, label: CLAUSE_META[type].label })),
    ...customSlots.map(def => ({ type: def.type, icon: def.icon, label: def.label })),
  ]

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-border hover:border-primary/50 bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:text-primary transition-all select-none focus:outline-none focus:ring-2 focus:ring-primary/40"
        data-testid="add-filter-btn"
      >
        <Plus className="size-3 text-primary" />
        <span>Add Filter</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-border bg-popover p-1 shadow-2xl animate-in fade-in-50 zoom-in-95">
          <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
            Add Filter Clause
          </div>
          {menuItems.map(item => {
            const active = existingTypes.has(item.type)
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  onAdd(item.type)
                  setOpen(false)
                }}
                className={cn(
                  'flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-md text-left transition-colors',
                  active ? 'opacity-50 bg-muted/30' : 'hover:bg-muted text-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
                {active && <span className="text-[9px] text-muted-foreground font-mono">added</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
