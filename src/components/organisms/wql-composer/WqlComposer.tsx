/**
 * WqlComposer — shared omni command bar (Variant B3) for composing WQL queries
 * of both kinds: content `find:` queries and analytics aggregate queries
 * (source-pivot model, issue #838 / decision #836).
 *
 * Token-slot pills with placeholder guidance, clause popover, add-filter menu,
 * where-join editor, clause model and WQL compiler — extracted from the
 * library-search prototype (issue #829) into a reusable component. Every
 * clause change re-composes and re-parses the WQL synchronously; the
 * diagnostics strip (issue #832) shows a validity badge, attributes parse
 * errors to the offending slot, summarizes the AST, and — when an
 * `execute` executor is wired — live stage counts, debounced at 150ms.
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
import { TokenSlotPill, AddFilterDropdown, AddCalcDropdown } from './QueryPalette'
import { diagnoseClauses } from './diagnostics'
import { WqlDiagnosticsStrip } from './WqlDiagnosticsStrip'
import {
  useWqlStageCounts,
  DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  type WqlExecutor,
} from './useWqlStageCounts'
import {
  type ClauseType,
  type QueryClause,
  getClauseMeta,
  clauseValue,
  sourcePlane,
  defaultClauses,
  pivotClauses,
  wqlToClauses,
} from './queryClauses'
import { parseQuery } from '@/services/analytics/query/wql'

// ── Public API ───────────────────────────────────────────────────────────────

export interface WqlValidationState {
  /** True when the composed WQL parses without error. */
  valid: boolean
  /** Parser error message when invalid. */
  error?: string
}

export interface WqlComposerProps {
  /** Seed clauses for uncontrolled usage. Defaults to source/time. */
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
  /**
   * Fired on Enter when no free text is pending — the run-on-submit signal
   * for hosts like the analytics explorer (issue #839). Receives the composed
   * WQL. Hosts embedding the composer in a list (palette) omit this and keep
   * their own Enter handling.
   */
  onSubmit?: (wql: string) => void
  /** Render the diagnostics strip (badge, AST summary, stage counts). Default true. */
  showDiagnostics?: boolean
  /**
   * Executor for live stage counts in the diagnostics strip — dispatch on
   * query kind, e.g. `(ast) => isFindQuery(ast) ? queryService.runFind(ast)
   * : queryService.runQuery(ast.raw)`. When omitted, the strip omits counts
   * and no query is executed.
   */
  execute?: WqlExecutor
  /** Debounce for live execution feedback. Default 150ms (decision #826). */
  debounceMs?: number
  /** Extension point: extra content rendered inside the bar, after the free-text input. */
  customSlots?: ReactNode
  /** Host actions appended on the diagnostics line, after the built-in
   * Add Calc / Add Filter menus (e.g. the Explorer's Save button). */
  diagnosticsActions?: ReactNode
  /**
   * Clause types kept in the model (WQL compile, diagnostics, change events)
   * but NOT rendered as pills — the host owns their UI outside the composer
   * (e.g. the Library renders the `source` head as a scope radio above the
   * bar). Indices into `clauses` are unaffected; the diagnostics strip still
   * reflects the hidden clauses, so the strip never lies about the query.
   */
  hiddenClauseTypes?: ClauseType[]
  /** Focus the free-text input on mount (e.g. when embedded in the palette, issue #834). */
  autoFocus?: boolean
  /** Free-text input placeholder (e.g. the explorer's WQL grammar hint,
   * issue #897). Defaults to the search-term guidance. */
  placeholder?: string
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
  onSubmit,
  showDiagnostics = true,
  execute,
  debounceMs = DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  customSlots,
  diagnosticsActions,
  hiddenClauseTypes,
  autoFocus = false,
  placeholder = 'Type search term and press Enter...',
  className,
}: WqlComposerProps) {
  const [internalClauses, setInternalClauses] = useState<QueryClause[]>(
    () => initialClauses ?? defaultClauses(),
  )
  const clauses = controlledClauses ?? internalClauses
  const hiddenTypes = useMemo(() => new Set<string>(hiddenClauseTypes), [hiddenClauseTypes])

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

  const stages = useWqlStageCounts(diagnostics.ast, diagnostics.valid, execute, debounceMs)

  const offendingClause = diagnostics.offendingClauseId
    ? clauses.find(c => c.id === diagnostics.offendingClauseId)
    : undefined
  const offendingLabel = offendingClause ? getClauseMeta(offendingClause.type).label : undefined

  const updateClause = (idx: number, patch: Partial<QueryClause>) => {
    const updated = clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    // Source edits pivot the query kind (decision #836): kind-specific
    // clauses are dropped, shared filters survive, head slots are seeded.
    const edited = clauses[idx]
    if (edited?.type === 'source' && patch.value !== undefined && patch.value !== edited.value) {
      setClauses(pivotClauses(updated, patch.value))
      return
    }
    setClauses(updated)
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

  // Live preview of what Enter will do with the box's pending text (#854):
  // a valid, composer-restorable WQL query is adopted wholesale; searchable
  // text (one or more words — multi-word phrases are quoted on emit, #867)
  // becomes a text chip; pure punctuation is an honest inline error instead
  // of a silent discard.
  const pending = useMemo((): { kind: 'query'; clauses: QueryClause[] } | { kind: 'text'; value: string } | { kind: 'invalid'; reason: string } | null => {
    const raw = freeText.trim()
    if (!raw) return null
    const restored = wqlToClauses(raw)
    if (restored) {
      const parsed = parseQuery(raw)
      if (!('error' in parsed && parsed.error)) return { kind: 'query', clauses: restored }
      // Composer-shaped but WQL-invalid (e.g. an empty metric): show the
      // parser's own message rather than a generic one.
      return { kind: 'invalid', reason: String(parsed.error) }
    }
    const words = raw.match(/[a-zA-Z0-9_-]+/g)
    if (!words || words.length === 0) {
      return { kind: 'invalid', reason: 'No searchable text — use words, or a full WQL query like find:note{tags:strength}' }
    }
    if (words.length > 1) {
      // Multi-word free text commits as a quoted text clause (#867) — the
      // value is quoted on emit so it round-trips through the grammar.
      return { kind: 'text', value: raw }
    }
    return { kind: 'text', value: words[0]! }
  }, [freeText])

  const addClause = (type: string) => {
    const seed =
      type === 'time' ? 'last 2w'
      : type === 'where' ? 'sum:totalVolume{} > 5000'
      : type === 'agg' ? 'sum'
      : type === 'groupby' ? 'week'
      : type === 'rollup' ? '1w'
      : ''
    setClauses([...clauses, makeClause(type, seed)])
  }

  /**
   * Add Calc menu handler. What a calculation means depends on the plane:
   * on a content plane the picked aggregator pivots the query to metrics
   * (decision #836); on the metrics plane it restores or retargets the
   * agg/metric head pills — the way back after clearing them.
   */
  const addCalc = (type: 'agg' | 'metric', value?: string) => {
    if (type === 'metric') {
      if (clauses.some(c => c.type === 'metric')) return
      // Insert after the head pills so the row reads source → agg → metric.
      const afterIdx = Math.max(
        clauses.findIndex(c => c.type === 'agg'),
        clauses.findIndex(c => c.type === 'source'),
      )
      const next = [...clauses]
      next.splice(afterIdx + 1, 0, makeClause('metric', ''))
      setClauses(next)
      return
    }

    const agg = value ?? 'sum'
    const existingIdx = clauses.findIndex(c => c.type === 'agg')
    if (existingIdx >= 0) {
      updateClause(existingIdx, { value: agg })
      return
    }
    if (sourcePlane(clauseValue(clauses, 'source', 'notes')) !== 'metrics') {
      setClauses(pivotClauses(clauses, 'metrics').map(c => (c.type === 'agg' ? { ...c, value: agg } : c)))
      return
    }
    // Metrics plane with the agg pill removed: re-seed it after the source pill.
    const sourceIdx = clauses.findIndex(c => c.type === 'source')
    const next = [...clauses]
    next.splice(sourceIdx + 1, 0, makeClause('agg', agg))
    setClauses(next)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (freeText.trim()) {
      e.preventDefault()
      // Handled here — don't let an embedding list (palette) also treat this
      // as "activate the active result".
      e.stopPropagation()
      if (pending?.kind === 'query') {
        setClauses(pending.clauses)
        setFreeText('')
      } else if (pending?.kind === 'text') {
        setClauses([...clauses, makeClause('text', pending.value)])
        setFreeText('')
      }
      // 'invalid': keep the text; the inline hint already says why.
      return
    }
    // Enter with no pending free text submits the composed query.
    if (onSubmit) {
      e.preventDefault()
      onSubmit(diagnostics.wql)
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

        {/* Token Slots — hidden types stay in the model, owned by host UI */}
        {clauses.map((clause, idx) =>
          hiddenTypes.has(clause.type) ? null : (
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
          ),
        )}

        {/* Quick Free-text Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={freeText}
          placeholder={placeholder}
          onChange={e => setFreeText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[140px] bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 font-mono"
          data-testid="wql-composer-input"
        />

        {customSlots}
      </div>

      {pending && (
        <div
          className={cn(
            'px-1.5 text-[11px] font-mono',
            pending.kind === 'invalid' ? 'text-red-500' : 'text-muted-foreground',
          )}
          data-testid="wql-composer-pending"
          role={pending.kind === 'invalid' ? 'alert' : undefined}
        >
          {pending.kind === 'query' && '↵ Use as query'}
          {pending.kind === 'text' && `↵ Search text: ${pending.value}`}
          {pending.kind === 'invalid' && pending.reason}
        </div>
      )}

      {/* The Add Calc / Add Filter menus live on the feedback line, not in
          the pill bar. When the strip is hidden they still get a footer row
          so the add paths never disappear. */}
      {showDiagnostics ? (
        <WqlDiagnosticsStrip
          diagnostics={diagnostics}
          offendingLabel={offendingLabel}
          stages={stages}
          actions={
            <>
              <AddCalcDropdown clauses={clauses} onAdd={addCalc} />
              <AddFilterDropdown clauses={clauses} onAdd={addClause} />
              {diagnosticsActions}
            </>
          }
        />
      ) : (
        <div className="flex items-center justify-end gap-1.5 px-1.5" data-testid="wql-add-row">
          <AddCalcDropdown clauses={clauses} onAdd={addCalc} />
          <AddFilterDropdown clauses={clauses} onAdd={addClause} />
          {diagnosticsActions}
        </div>
      )}
    </div>
  )
}
