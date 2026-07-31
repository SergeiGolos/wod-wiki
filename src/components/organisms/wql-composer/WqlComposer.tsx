/**
 * WqlComposer — shared omni command bar (Variant B3) for composing WQL `find:` queries.
 *
 * Token-slot pills with placeholder guidance, clause popover, add-filter menu,
 * where-join editor, clause model and WQL compiler — extracted from the
 * library-search prototype (issue #829) into a reusable component. Every
 * clause change re-composes and re-parses the WQL synchronously; the
 * diagnostics strip (issue #832) shows a validity badge, attributes parse
 * errors to the offending slot, summarizes the AST, and — when an
 * `executeFind` executor is wired — live matched/selected stage counts,
 * debounced at 150ms.
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
import type { AnyParsedQuery } from '@/services/analytics/query/wql'
import { useComposerSlots } from './ComposerRegistry'
import { TokenSlotPill, AddFilterDropdown } from './QueryPalette'
import { diagnoseClauses } from './diagnostics'
import { WqlDiagnosticsStrip } from './WqlDiagnosticsStrip'
import {
  useWqlStageCounts,
  DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  type FindExecutor,
} from './useWqlStageCounts'
import {
  type QueryClause,
  getClauseMeta,
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
  /** Render the diagnostics strip (badge, AST summary, stage counts). Default true. */
  showDiagnostics?: boolean
  /**
   * Executor for live stage counts (matched/selected) in the diagnostics
   * strip — typically `(ast) => queryService.runFind(ast)`. When omitted, the
   * strip omits counts and no query is executed.
   */
  executeFind?: FindExecutor
  /** Debounce for live execution feedback. Default 150ms (decision #826). */
  debounceMs?: number
  /** Extension point: extra content rendered inside the bar, after the add-filter menu. */
  customSlots?: ReactNode
  /** Focus the free-text input on mount (e.g. when embedded in the palette, issue #834). */
  autoFocus?: boolean
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
  showDiagnostics = true,
  executeFind,
  debounceMs = DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  customSlots,
  autoFocus = false,
  className,
}: WqlComposerProps) {
  const [internalClauses, setInternalClauses] = useState<QueryClause[]>(
    () => initialClauses ?? defaultClauses(),
  )
  const clauses = controlledClauses ?? internalClauses

  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null)
  const [freeText, setFreeText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Deferred so a host dialog/list wins its own mount effects first.
  useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [autoFocus])

  const setClauses = useCallback(
    (next: QueryClause[]) => {
      if (controlledClauses === undefined) setInternalClauses(next)
      onClausesChange?.(next)
    },
    [controlledClauses, onClausesChange],
  )

  // Registry subscription: (un)registering a slot recompiles WQL and re-runs
  // validation even when the clause list itself is unchanged.
  const registeredSlots = useComposerSlots()

  // Compose + parse + attribute failures to a slot — synchronous and cheap
  // (short strings through the Lezer grammar), well within the ~150ms
  // feedback budget; only execution is debounced (useWqlStageCounts).
  const diagnostics = useMemo(() => diagnoseClauses(clauses), [clauses, registeredSlots])

  // Latest-callback refs: consumers commonly pass inline handlers; depending
  // on their identity would re-fire (and loop) on every parent render.
  const callbacksRef = useRef({ onWqlChange, onValidationChange, onAstChange })
  callbacksRef.current = { onWqlChange, onValidationChange, onAstChange }

  // Emit composed WQL, validation state, and AST on mount and every change.
  // The public WqlValidationState stays minimal ({ valid, error? }); slot
  // attribution lives on the internal diagnostics object.
  useEffect(() => {
    const validation: WqlValidationState = diagnostics.valid
      ? { valid: true }
      : { valid: false, error: diagnostics.error }
    callbacksRef.current.onWqlChange?.(diagnostics.wql)
    callbacksRef.current.onAstChange?.(diagnostics.ast)
    callbacksRef.current.onValidationChange?.(validation)
  }, [diagnostics])

  const stages = useWqlStageCounts(diagnostics.ast, diagnostics.valid, executeFind, debounceMs)

  const offendingClause = diagnostics.offendingClauseId
    ? clauses.find(c => c.id === diagnostics.offendingClauseId)
    : undefined
  const offendingLabel = offendingClause ? getClauseMeta(offendingClause.type).label : undefined

  const updateClause = (idx: number, patch: Partial<QueryClause>) => {
    setClauses(clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const removeClause = (idx: number) => {
    setClauses(clauses.filter((_, i) => i !== idx))
  }

  const makeClause = (type: string, value: string): QueryClause => {
    const meta = getClauseMeta(type)
    return {
      id: `c-${Date.now()}-${Math.random()}`,
      type,
      label: meta.label,
      value,
      inputType: meta.inputType,
      placeholder: meta.placeholder,
    }
  }

  const addClause = (type: string) => {
    const value = type === 'time' ? 'last 2w' : type === 'where' ? 'sum:totalVolume{} > 5000' : ''
    setClauses([...clauses, makeClause(type, value)])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && freeText.trim()) {
      e.preventDefault()
      // Handled here — don't let an embedding list (palette) also treat this
      // as "activate the active result".
      e.stopPropagation()
      setClauses([...clauses, makeClause('text', freeText.trim())])
      setFreeText('')
    }
  }

  return (
    <div className="space-y-1">
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
            invalid={diagnostics.offendingClauseId === clause.id}
            invalidReason={diagnostics.offendingClauseId === clause.id ? diagnostics.error : undefined}
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

      {showDiagnostics && (
        <WqlDiagnosticsStrip
          diagnostics={diagnostics}
          offendingLabel={offendingLabel}
          stages={stages}
        />
      )}
    </div>
  )
}
