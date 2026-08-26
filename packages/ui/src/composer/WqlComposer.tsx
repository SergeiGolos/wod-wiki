/**
 * WqlComposer — shared omni command bar for composing WQL queries of all
 * three families: content find:, analytics aggregates, and rows:.
 *
 * State discipline (ticket 013): the composer state observed from outside is
 * the C6 AST — restore goes through `parseQuery` + `astToPills`, emission
 * goes through `pillsToAst` + the engine serializer, and the public props
 * carry WQL strings only (`initialQuery` / `query` / `onQueryChange` /
 * `onSubmit`). The pill list is the editor's transient working set — an
 * edit in progress can be WQL-invalid (empty metric, half-typed filter), so
 * pills are held locally and every keystroke re-derives the AST through the
 * real parser. Strings never leave the composer except via the serializer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Command } from 'lucide-react';
import { cn } from '../utils/cn';
import { useComposerSlots } from './ComposerRegistry';
import { TokenSlotPill, AddFilterDropdown, AddCalcDropdown } from './QueryPalette';
import { diagnosePills } from './diagnostics';
import { WqlDiagnosticsStrip } from './WqlDiagnosticsStrip';
import {
  useWqlStageCounts,
  DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  type WqlExecutor,
  type AnyParsedQuery,
} from './useWqlStageCounts';
import { type ClauseType, type QueryClause, getClauseMeta, sourcePlane } from './queryClauses';
import {
  pillsToAst,
  wqlToPills,
  pivotPills,
  defaultPills,
  pillValue,
} from './queryAst';
import { parseQuery, serialize } from '@bitcobblers/wod-wiki-wql';

// ── Public API ───────────────────────────────────────────────────────────────

export interface WqlValidationState {
  /** True when the composed WQL parses without error. */
  valid: boolean;
  /** Parser error message when invalid. */
  error?: string;
}

export interface WqlComposerProps {
  /** Seed query for uncontrolled usage. Defaults to the content-plane default. */
  initialQuery?: string;
  /** Controlled WQL text. When provided, the component does not own query state. */
  query?: string;
  /** Fired whenever the composed query changes (add / edit / remove a pill). */
  onQueryChange?: (wql: string) => void;
  /** Fired (including on mount) with parse validation state. */
  onValidationChange?: (state: WqlValidationState) => void;
  /** Fired (including on mount) with the parsed AST — the composer state. */
  onAstChange?: (ast: AnyParsedQuery) => void;
  /**
   * Fired on Enter when no free text is pending — the run-on-submit signal
   * for hosts like the analytics explorer. Receives the composed WQL.
   */
  onSubmit?: (wql: string) => void;
  /** Render the diagnostics strip (badge, AST summary, stage counts). Default true. */
  showDiagnostics?: boolean;
  /**
   * Executor for live stage counts in the diagnostics strip.
   */
  execute?: WqlExecutor;
  /** Debounce for live execution feedback. Default 150ms. */
  debounceMs?: number;
  /** Extension point: extra content rendered inside the bar, after the free-text input. */
  customSlots?: ReactNode;
  /** Host actions appended on the diagnostics line. */
  diagnosticsActions?: ReactNode;
  /**
   * Pill types kept in the model but NOT rendered as pills.
   */
  hiddenClauseTypes?: ClauseType[];
  /** Focus the free-text input on mount. */
  autoFocus?: boolean;
  /** Free-text input placeholder. */
  placeholder?: string;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function WqlComposer({
  initialQuery,
  query: controlledQuery,
  onQueryChange,
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
  const [internalPills, setInternalPills] = useState<QueryClause[]>(
    () => wqlToPills(initialQuery ?? '') ?? defaultPills(),
  );
  const controlledPills = useMemo(
    () => (controlledQuery === undefined ? undefined : wqlToPills(controlledQuery)),
    [controlledQuery],
  );
  // A controlled query that isn't pill-expressible rides in the free-text
  // input instead (raw-text escape hatch) — pills stay empty.
  const pills = controlledPills ?? internalPills;
  const hiddenTypes = useMemo(() => new Set<string>(hiddenClauseTypes), [hiddenClauseTypes]);

  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
  const [freeText, setFreeText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const freeTextInitRef = useRef<string | null>(null);

  // Controlled + not pill-expressible → preload the raw text once per query
  // value so the user edits the real query, not a rewritten default.
  useEffect(() => {
    if (controlledQuery !== undefined && controlledPills === null && freeTextInitRef.current !== controlledQuery) {
      freeTextInitRef.current = controlledQuery;
      setFreeText(controlledQuery);
    }
  }, [controlledQuery, controlledPills]);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const setPills = useCallback(
    (next: QueryClause[]) => {
      if (controlledQuery === undefined) setInternalPills(next);
    },
    [controlledQuery],
  );

  const registeredSlots = useComposerSlots();
  const diagnostics = useMemo(() => diagnosePills(pills), [pills, registeredSlots]);

  const callbacksRef = useRef({ onQueryChange, onValidationChange, onAstChange });
  callbacksRef.current = { onQueryChange, onValidationChange, onAstChange };

  // Parent notification. Emissions derive from the AST — never from pill
  // text. `onQueryChange` fires here only uncontrolled; controlled edits
  // emit through emitIfControlled so the canonical text round-trips into
  // the `query` prop without a mount-time rewrite of the parent's string.
  useEffect(() => {
    const validation: WqlValidationState = diagnostics.valid
      ? { valid: true }
      : { valid: false, error: diagnostics.error };
    if (controlledQuery === undefined) callbacksRef.current.onQueryChange?.(diagnostics.wql);
    callbacksRef.current.onAstChange?.(diagnostics.ast);
    callbacksRef.current.onValidationChange?.(validation);
  }, [diagnostics]);

  const stages = useWqlStageCounts(diagnostics.ast, diagnostics.valid, execute, debounceMs);

  const offendingPill = diagnostics.offendingClauseId
    ? pills.find((c) => c.id === diagnostics.offendingClauseId)
    : undefined;
  const offendingLabel = offendingPill ? getClauseMeta(offendingPill.type).label : undefined;

  const updatePill = (idx: number, patch: Partial<QueryClause>) => {
    const updated = pills.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    const edited = pills[idx];
    if (edited?.type === 'source' && patch.value !== undefined && patch.value !== edited.value) {
      setPills(pivotPills(updated, patch.value));
      emitIfControlled(pivotPills(updated, patch.value));
      return;
    }
    setPills(updated);
    emitIfControlled(updated);
  };

  const removePill = (idx: number) => {
    const next = pills.filter((_, i) => i !== idx);
    setPills(next);
    emitIfControlled(next);
  };

  /** In controlled mode the parent owns the query — push the edit out so the
   * prop comes back down. No-op uncontrolled (the effect emits on mount and
   * on diagnostics changes). */
  const emitIfControlled = (next: QueryClause[]) => {
    if (controlledQuery !== undefined) {
      const nextAst = pillsToAst(next);
      const nextWql = serialize(nextAst);
      if (nextWql !== controlledQuery) callbacksRef.current.onQueryChange?.(nextWql);
    }
  };

  const makePill = (type: string, value: string): QueryClause => {
    const meta = getClauseMeta(type);
    return {
      id: `c-${Date.now()}-${Math.random()}`,
      type,
      label: meta.label,
      value,
      inputType: meta.inputType,
      placeholder: meta.placeholder,
    };
  };

  const pending = useMemo((): { kind: 'query'; pills: QueryClause[] } | { kind: 'text'; value: string } | { kind: 'invalid'; reason: string } | null => {
    const raw = freeText.trim();
    if (!raw) return null;
    const restored = wqlToPills(raw);
    if (restored) return { kind: 'query', pills: restored };
    const parsed = parseQuery(raw);
    // A query-shaped string the parser rejects is invalid; anything else is
    // a text search.
    if (parsed.error && /[:{]/.test(raw)) {
      return { kind: 'invalid', reason: String(parsed.error) };
    }
    const words = raw.match(/[a-zA-Z0-9_-]+/g);
    if (!words || words.length === 0) {
      return { kind: 'invalid', reason: 'No searchable text — use words, or a full WQL query like find:note{tags:strength}' };
    }
    if (words.length > 1) {
      return { kind: 'text', value: raw };
    }
    return { kind: 'text', value: words[0]! };
  }, [freeText]);

  const addPill = (pill: QueryClause) => {
    const type = pill.type;
    const seed =
      type === 'time' ? 'last 2w'
      : type === 'where' ? 'sum:totalVolume{} > 5000'
      : type === 'agg' ? 'sum'
      : type === 'groupby' ? 'week'
      : type === 'rollup' ? '1w'
      : pill.value;
    const next = [...pills, { ...pill, value: seed }];
    setPills(next);
    emitIfControlled(next);
  };

  const addCalc = (pill: QueryClause) => {
    const { type, value } = pill;
    if (type === 'metric') {
      if (pills.some((c) => c.type === 'metric')) return;
      const afterIdx = Math.max(
        pills.findIndex((c) => c.type === 'agg'),
        pills.findIndex((c) => c.type === 'source'),
      );
      const next = [...pills];
      next.splice(afterIdx + 1, 0, makePill('metric', value));
      setPills(next);
      emitIfControlled(next);
      return;
    }

    if (type !== 'agg') {
      addPill(pill);
      return;
    }
    const agg = value || 'sum';
    const existingIdx = pills.findIndex((c) => c.type === 'agg');
    if (existingIdx >= 0) {
      updatePill(existingIdx, { value: agg });
      return;
    }
    if (sourcePlane(pillValue(pills, 'source', 'notes')) !== 'metrics') {
      const next = pivotPills(pills, 'metrics').map((c) => (c.type === 'agg' ? { ...c, value: agg } : c));
      setPills(next);
      emitIfControlled(next);
      return;
    }
    const sourceIdx = pills.findIndex((c) => c.type === 'source');
    const next = [...pills];
    next.splice(sourceIdx + 1, 0, makePill('agg', agg));
    setPills(next);
    emitIfControlled(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    if (freeText.trim()) {
      e.preventDefault();
      e.stopPropagation();
      if (pending?.kind === 'query') {
        setPills(pending.pills);
        emitIfControlled(pending.pills);
        setFreeText('');
      } else if (pending?.kind === 'text') {
        const next = [...pills, makePill('text', pending.value)];
        setPills(next);
        emitIfControlled(next);
        setFreeText('');
      }
      return;
    }
    if (onSubmit) {
      e.preventDefault();
      onSubmit(diagnostics.wql);
    }
  };

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

        {pills.map((pill, idx) =>
          hiddenTypes.has(pill.type) ? null : (
            <TokenSlotPill
              key={pill.id}
              clause={pill}
              isActive={activeSlotIdx === idx}
              invalid={diagnostics.offendingClauseId === pill.id}
              invalidReason={diagnostics.offendingClauseId === pill.id ? diagnostics.error : undefined}
              onClick={() => setActiveSlotIdx(idx)}
              onChange={(patch) => updatePill(idx, patch)}
              onRemove={() => removePill(idx)}
              compact
            />
          ),
        )}

        <input
          ref={inputRef}
          type="text"
          value={freeText}
          placeholder={placeholder}
          onChange={(e) => setFreeText(e.target.value)}
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

      {showDiagnostics ? (
        <WqlDiagnosticsStrip
          diagnostics={diagnostics}
          offendingLabel={offendingLabel}
          stages={stages}
          actions={
            <>
              <AddCalcDropdown clauses={pills} onAdd={addCalc} />
              <AddFilterDropdown clauses={pills} onAdd={addPill} />
              {diagnosticsActions}
            </>
          }
        />
      ) : (
        <div className="flex items-center justify-end gap-1.5 px-1.5" data-testid="wql-add-row">
          <AddCalcDropdown clauses={pills} onAdd={addCalc} />
          <AddFilterDropdown clauses={pills} onAdd={addPill} />
          {diagnosticsActions}
        </div>
      )}
    </div>
  );
}
