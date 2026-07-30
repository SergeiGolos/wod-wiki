/**
 * WqlComposer — shared omni command bar (Variant B3) for composing WQL `find:` queries.
 *
 * Token-slot pills with placeholder guidance, clause popover, add-filter menu,
 * where-join editor, clause model and WQL compiler — extracted from the
 * library-search prototype (issue #829) into a reusable component.
 *
 * Keyboard contract (as prototyped):
 *   - Tab / Shift+Tab traverses token slots
 *   - Up / Down cycles popover options
 *   - Enter selects, Escape dismisses
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseQuery, type AnyParsedQuery } from '@/services/analytics/query/wql'
import { TokenSlotPill, AddFilterDropdown } from './QueryPalette'
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
  clausesToWql,
  defaultClauses,
} from './queryClauses'

// ── Public API ───────────────────────────────────────────────────────────────

export interface WqlValidationState {
  /** True when the composed WQL parses without error. */
  valid: boolean
  /** Parser error message when invalid. */
  error?: string
}

export interface WqlComposerProps {
  /** Seed clauses for uncontrolled usage. Defaults to target/scope/time. */
  initialClauses?: QueryClause[]
  /** Controlled clauses. When provided, the component does not own clause state. */
  clauses?: QueryClause[]
  /** Fired whenever the clause list changes (add / edit / remove). */
  onClausesChange?: (clauses: QueryClause[]) => void
  /** Fired (including on mount) with the composed WQL string. */
  onWqlChange?: (wql: string) => void
  /** Fired (including on mount) with parse validation state. */
  onValidationChange?: (state: WqlValidationState) => void
  /** Fired (including on mount) with the parsed AST. */
  onAstChange?: (ast: AnyParsedQuery) => void
  /** Extension point: extra content rendered inside the bar, after the add-filter menu. */
  customSlots?: ReactNode
  className?: string
}

// ── Component ────────────────────────────────────────────────────────────────

export function WqlComposer({
  initialClauses,
  clauses: controlledClauses,
  onClausesChange,
  onWqlChange,
  onValidationChange,
  onAstChange,
  customSlots,
  className,
}: WqlComposerProps) {
  const [internalClauses, setInternalClauses] = useState<QueryClause[]>(
    () => initialClauses ?? defaultClauses(),
  )
  const clauses = controlledClauses ?? internalClauses

  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null)
  const [freeText, setFreeText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const setClauses = useCallback(
    (next: QueryClause[]) => {
      if (controlledClauses === undefined) setInternalClauses(next)
      onClausesChange?.(next)
    },
    [controlledClauses, onClausesChange],
  )

  const wql = useMemo(() => clausesToWql(clauses), [clauses])

  // Latest-callback refs: consumers commonly pass inline handlers; depending
  // on their identity would re-fire (and loop) on every parent render.
  const callbacksRef = useRef({ onWqlChange, onValidationChange, onAstChange })
  callbacksRef.current = { onWqlChange, onValidationChange, onAstChange }

  // Emit composed WQL, validation state, and AST on mount and every change.
  useEffect(() => {
    const ast = parseQuery(wql)
    callbacksRef.current.onWqlChange?.(wql)
    callbacksRef.current.onAstChange?.(ast)
    callbacksRef.current.onValidationChange?.(ast.error ? { valid: false, error: ast.error } : { valid: true })
  }, [wql])

  const updateClause = (idx: number, patch: Partial<QueryClause>) => {
    setClauses(clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const removeClause = (idx: number) => {
    setClauses(clauses.filter((_, i) => i !== idx))
  }

  const makeClause = (type: ClauseType, value: string): QueryClause => {
    const meta = CLAUSE_META[type]
    return {
      id: `c-${Date.now()}-${Math.random()}`,
      type,
      label: meta.label,
      value,
      inputType: meta.inputType,
      placeholder: meta.placeholder,
    }
  }

  const addClause = (type: ClauseType) => {
    const value = type === 'time' ? 'last 2w' : type === 'where' ? 'sum:totalVolume{} > 5000' : ''
    setClauses([...clauses, makeClause(type, value)])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && freeText.trim()) {
      e.preventDefault()
      setClauses([...clauses, makeClause('text', freeText.trim())])
      setFreeText('')
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex flex-wrap items-center gap-1.5 min-h-[46px] rounded-xl border border-border bg-muted/20 px-3 py-1.5 text-xs transition-all cursor-text shadow-xs',
        activeSlotIdx !== null && 'border-primary/60 bg-background ring-2 ring-primary/20 shadow-md',
        className,
      )}
      data-testid="wql-composer"
    >
      <Command className="size-4 text-amber-500 shrink-0 mr-0.5" />

      {/* Token Slots */}
      {clauses.map((clause, idx) => (
        <TokenSlotPill
          key={clause.id}
          clause={clause}
          isActive={activeSlotIdx === idx}
          onClick={() => setActiveSlotIdx(idx)}
          onChange={patch => updateClause(idx, patch)}
          onRemove={() => removeClause(idx)}
          compact
        />
      ))}

      {/* Quick Free-text Search Input */}
      <input
        ref={inputRef}
        type="text"
        value={freeText}
        placeholder="Type search term and press Enter..."
        onChange={e => setFreeText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-[140px] bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 font-mono"
        data-testid="wql-composer-input"
      />

      <AddFilterDropdown clauses={clauses} onAdd={addClause} />

      {customSlots}
    </div>
  )
}
