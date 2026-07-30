/**
 * QueryPalette — the shared command-palette interface.
 *
 * The query is a stack of "clauses" (one per row). Up/Down navigates between
 * clauses; the active clause shows its combobox (free-text with suggestions,
 * radio buttons, or a select dropdown). The user can add and remove clauses.
 *
 * Three prototype variants (A, B, C) each wrap this palette in a different
 * presentation:
 *   A — always-visible vertical stack (each clause is a row)
 *   B — spotlight-style overlay (single input, dropdown shows the clauses)
 *   C — card stack (each clause is an expandable card)
 */
import { useState, useRef, useEffect } from 'react'
import type React from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
  getSuggestions,
  defaultClauses,
} from './queryClauses'

export interface QueryPaletteProps {
  clauses: QueryClause[]
  onChange: (clauses: QueryClause[]) => void
}

let clauseCounter = 0
const newClauseId = () => `c-${Date.now()}-${clauseCounter++}`

export function QueryPalette({ clauses, onChange }: QueryPaletteProps) {
  const [activeIdx, setActiveIdx] = useState(0)

  const updateClause = (idx: number, patch: Partial<QueryClause>) => {
    onChange(clauses.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  const addClause = (type: ClauseType) => {
    const meta = CLAUSE_META[type]
    const newClause: QueryClause = {
      id: newClauseId(),
      type,
      label: meta.label,
      value: '',
      inputType: meta.inputType,
      placeholder: meta.placeholder,
    }
    const next = [...clauses, newClause]
    onChange(next)
    setActiveIdx(next.length - 1)
  }

  const removeClause = (idx: number) => {
    const next = clauses.filter((_, i: number) => i !== idx)
    onChange(next.length ? next : defaultClauses())
    setActiveIdx(0)
  }

  return (
    <div className="space-y-1.5" data-testid="query-palette">
      {clauses.map((clause, idx) => (
        <ClauseRow
          key={clause.id}
          clause={clause}
          isActive={idx === activeIdx}
          onFocus={() => setActiveIdx(idx)}
          onChange={patch => updateClause(idx, patch)}
          onRemove={() => removeClause(idx)}
        />
      ))}

      <div className="flex items-center gap-2 pt-1">
        <AddClauseButton onAdd={addClause} />
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          ↑↓ navigate · typeahead · ± to add/remove
        </span>
      </div>
    </div>
  )
}

// ── Individual clause row ──────────────────────────────────────────────────

export function ClauseRow({
  clause, isActive, onFocus, onChange, onRemove,
}: {
  clause: QueryClause
  isActive: boolean
  onFocus: () => void
  onChange: (patch: Partial<QueryClause>) => void
  onRemove: () => void
}) {
  const meta = CLAUSE_META[clause.type]
  const suggestions = getSuggestions(clause.type)

  const [queryInput, setQueryInput] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isActive && inputRef.current) inputRef.current.focus()
  }, [isActive])

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(queryInput.toLowerCase()),
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx((i: number) => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx((i: number) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); const v = filtered[highlightIdx]; if (v) { onChange({ value: v }); setOpen(false); setQueryInput('') } }
    if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border transition-colors group',
        isActive
          ? 'border-primary/50 bg-primary/5 shadow-sm'
          : 'border-border bg-background hover:border-border/70',
      )}
      onClick={onFocus}
      data-testid={`clause-${clause.type}`}
    >
      {/* Type label */}
      <div className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 min-w-[100px]">
        <span className="text-sm">{meta.icon}</span>
        <span>{clause.label}</span>
      </div>

      {/* Input */}
      {clause.type === 'source' || clause.type === 'time' ? (
        <div className="flex flex-wrap gap-1 flex-1 min-w-0 py-1 pr-1.5">
          {(clause.type === 'source' ? ['Notes', 'Sessions', 'Posts'] : TIME_OPTIONS_BUILTIN).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={e => { e.stopPropagation(); onChange({ value: opt }) }}
              className={cn(
                'px-2 py-0.5 text-[11px] font-medium rounded-full transition-colors',
                clause.value === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
              data-testid={`clause-${clause.type}-opt-${opt}`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={clause.value || queryInput}
            placeholder={meta.placeholder}
            onChange={e => {
              setQueryInput(e.target.value)
              if (!open) setOpen(true)
              if (e.target.value === '') onChange({ value: '' })
            }}
            onFocus={() => { setOpen(true); setHighlightIdx(0) }}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className={cn(
              'w-full bg-transparent px-2 py-1.5 text-sm focus:outline-none',
              clause.value && 'font-medium',
            )}
            data-testid={`clause-${clause.type}-input`}
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-lg py-1">
              {filtered.map((s, idx) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { onChange({ value: s }); setOpen(false); setQueryInput(''); setHighlightIdx(0) }}
                  className={cn(
                    'block w-full text-left px-2.5 py-1 text-xs transition-colors',
                    idx === highlightIdx ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                  )}
                  data-testid={`clause-${clause.type}-suggestion-${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="shrink-0 size-6 mr-1.5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove clause"
        data-testid={`clause-${clause.type}-remove`}
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

const TIME_OPTIONS_BUILTIN = ['Today', 'Past week', 'Past 2 weeks', 'Past month', 'Past 3 months', 'Past year', 'All time']

// ── Add-clause button ─────────────────────────────────────────────────────

function AddClauseButton({ onAdd }: { onAdd: (type: ClauseType) => void }) {
  const [open, setOpen] = useState(false)
  const available = (['text', 'catalog', 'tag', 'effort', 'discipline', 'time'] as ClauseType[])
    .filter(t => !['source'].includes(t))
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
        data-testid="add-clause-btn"
      >
        <span className="flex items-center justify-center size-4 rounded-full border border-primary/30 bg-primary/5">
          <Plus className="size-2.5" />
        </span>
        Add filter
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 min-w-[140px] rounded-md border border-border bg-background shadow-lg py-1">
            {available.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { onAdd(t); setOpen(false) }}
                className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2"
              >
                <span className="text-sm">{CLAUSE_META[t].icon}</span>
                {CLAUSE_META[t].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export { clausesToWql, defaultClauses } from './queryClauses'
