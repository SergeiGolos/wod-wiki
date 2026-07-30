/**
 * QueryPalette — Shared building blocks for Spotlight Query Builders.
 *
 * Provides:
 *   - TokenSlotPill: Interactive token slot pill with Tab/Shift+Tab navigation and Up/Down selection.
 *   - ClausePopover: Inline editor popover with keyboard arrow navigation.
 *   - AddFilterDropdown: Menu to add new query filter slots.
 */
import { useState, useRef, useEffect } from 'react'
import { Plus, X, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
  getSuggestions,
  TARGET_OPTIONS,
  SCOPE_OPTIONS,
  TIME_OPTIONS,
  WHERE_AGGREGATORS,
  WHERE_METRICS,
  WHERE_OPERATORS,
} from './queryClauses'

// ── TokenSlotPill ────────────────────────────────────────────────────────────

export interface TokenSlotPillProps {
  clause: QueryClause
  isActive?: boolean
  onClick?: () => void
  onRemove?: () => void
  onChange?: (patch: Partial<QueryClause>) => void
  compact?: boolean
  placeholderOverride?: string
}

export function TokenSlotPill({
  clause,
  isActive,
  onClick,
  onRemove,
  onChange,
  compact = false,
  placeholderOverride,
}: TokenSlotPillProps) {
  const meta = CLAUSE_META[clause.type]
  const [open, setOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)

  const hasValue = Boolean(clause.value && clause.value.trim())

  // Keydown listener for Tab, Up, Down, Enter, Escape when pill is focused
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) setOpen(true)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(o => !o)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <div
        ref={pillRef}
        tabIndex={0}
        onClick={() => {
          onClick?.()
          setOpen(o => !o)
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer transition-all select-none focus:outline-none focus:ring-2 focus:ring-primary/40',
          hasValue
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

        {onRemove && clause.type !== 'target' && clause.type !== 'scope' && (
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

      {open && onChange && (
        <ClausePopover
          clause={clause}
          onClose={() => setOpen(false)}
          onChange={patch => {
            onChange(patch)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ── ClausePopover: Keyboard-navigable Dropdown ───────────────────────────────

export function ClausePopover({
  clause,
  onClose,
  onChange,
}: {
  clause: QueryClause
  onClose: () => void
  onChange: (patch: Partial<QueryClause>) => void
}) {
  const meta = CLAUSE_META[clause.type]
  const [val, setVal] = useState(clause.value)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
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

  const suggestions = getSuggestions(clause.type)

  const items = clause.type === 'target'
    ? TARGET_OPTIONS.map(o => ({ value: o.value, label: `${o.value} — ${o.description}` }))
    : clause.type === 'scope'
    ? SCOPE_OPTIONS.map(o => ({ value: o.value, label: `${o.value} — ${o.description}` }))
    : clause.type === 'time'
    ? TIME_OPTIONS.map(o => ({ value: o.value, label: o.label }))
    : suggestions.map(s => ({ value: s, label: s }))

  const filteredItems = items.filter(item => item.value.toLowerCase().includes(val.toLowerCase()) || item.label.toLowerCase().includes(val.toLowerCase()))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(i => Math.min(i + 1, Math.max(0, filteredItems.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[highlightIdx]) {
        onChange({ value: filteredItems[highlightIdx].value })
      } else if (val.trim()) {
        onChange({ value: val.trim() })
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      ref={popoverRef}
      onKeyDown={handleKeyDown}
      className="absolute top-full left-0 mt-1.5 z-50 min-w-[240px] max-w-[320px] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-2 animate-in fade-in-50 zoom-in-95"
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
          {clause.type !== 'target' && clause.type !== 'scope' && clause.type !== 'time' && (
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

// ── AddFilterDropdown ──────────────────────────────────────────────────────

export function AddFilterDropdown({
  clauses,
  onAdd,
}: {
  clauses: QueryClause[]
  onAdd: (type: ClauseType) => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const existingTypes = new Set(clauses.map(c => c.type))
  const available: ClauseType[] = [
    'text',
    'tag',
    'effort',
    'discipline',
    'catalog',
    'type',
    'has',
    'time',
    'where',
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
          {available.map(type => {
            const meta = CLAUSE_META[type]
            const active = existingTypes.has(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAdd(type)
                  setOpen(false)
                }}
                className={cn(
                  'flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-md text-left transition-colors',
                  active ? 'opacity-50 bg-muted/30' : 'hover:bg-muted text-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{meta.icon}</span>
                  <span className="font-medium">{meta.label}</span>
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
