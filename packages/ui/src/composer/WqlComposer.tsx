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
import { TokenSlotPill, AddFilterDropdown, AddCalcDropdown } from './QueryPalette';
import { InlineClauseEditor } from './InlineClauseEditor';
import { useClauseItems } from './clauseItems';
import { composerRegistry } from './ComposerRegistry';
import { diagnosePills, type WqlDiagnostics } from './diagnostics';
import { WqlDiagnosticsStrip } from './WqlDiagnosticsStrip';
import {
  useWqlStageCounts,
  DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  type WqlExecutor,
  type AnyParsedQuery,
} from './useWqlStageCounts';
import {
  type ClauseType,
  type QueryClause,
  CLAUSE_META,
  allowedFilterTypesForSource,
  getClauseMeta,
  sourcePlane,
} from './queryClauses';
import { matchFilterTypeahead } from './filterTypeahead';
import {
  pillsToAst,
  pillsToWql,
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
  /**
   * Live-search emission: debounced (~150 ms) merged query — the committed
   * pills with the uncommitted free text serialized as a text filter, the
   * same string Enter commits. Fires on mount and whenever pills or pending
   * text change; a mid-edit invalid query emits nothing, so hosts filtering
   * as-you-type keep their last results instead of flashing empty.
   */
  onLiveQueryChange?: (wql: string) => void;
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
  /** Where the diagnostics/action strip renders. 'top' presents it as a header
   *  row above the composer box (command-palette style); 'bottom' (default)
   *  keeps it beneath the box. */
  diagnosticsPosition?: 'top' | 'bottom';
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

/** Keystroke-to-live-search delay for onLiveQueryChange (#1010). */
export const LIVE_QUERY_DEBOUNCE_MS = 150;

// ── Component ────────────────────────────────────────────────────────────────

export function WqlComposer({
  initialQuery,
  query: controlledQuery,
  onQueryChange,
  onLiveQueryChange,
  onValidationChange,
  onAstChange,
  onSubmit,
  showDiagnostics = true,
  execute,
  debounceMs = DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  customSlots,
  diagnosticsActions,
  diagnosticsPosition = 'bottom',
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

  // Filter typeahead: typing a filter key proposes adding that filter — or,
  // when a pill of the type is already on the query, editing it. Accept
  // (Tab or tap) adds/activates the pill; the condition editor is the
  // inline list under the composer box (InlineClauseEditor).
  const [typeaheadDismissed, setTypeaheadDismissed] = useState(false);
  // Highlighted option row while a pill's value editor is open.
  const [editorHighlight, setEditorHighlight] = useState(0);

  // Mirror the controlled query prop so the live-search effect can emit the
  // original string when no free text is pending. That avoids re-serializing
  // visible pills and losing hidden clauses (e.g. source scope in LibraryPage)
  // or producing a textually different but semantically identical query.
  const controlledQueryRef = useRef(controlledQuery);
  controlledQueryRef.current = controlledQuery;

  const inputRef = useRef<HTMLInputElement>(null);
  const freeTextInitRef = useRef<string | null>(null);

  // Controlled + not pill-expressible → preload the raw text once per query
  // value so the user edits the real query, not a rewritten default; clear
  // it when the query becomes pill-expressible again.
  useEffect(() => {
    if (controlledQuery === undefined) return;
    if (controlledPills === null) {
      if (freeTextInitRef.current !== controlledQuery) {
        freeTextInitRef.current = controlledQuery;
        setFreeText(controlledQuery);
      }
    } else if (freeTextInitRef.current !== null) {
      freeTextInitRef.current = null;
      setFreeText('');
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

  // Raw escape hatch (controlled, not pill-expressible): diagnostics describe
  // the ACTUAL controlled query — never the fallback internal pills.
  const rawEscape = controlledQuery !== undefined && controlledPills === null;
  const diagnostics = useMemo((): WqlDiagnostics => {
    if (rawEscape) {
      const ast = parseQuery(controlledQuery!);
      return {
        valid: !ast.error,
        wql: controlledQuery!,
        ast,
        error: ast.error,
      };
    }
    return diagnosePills(pills);
  }, [rawEscape, controlledQuery, pills]);

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
  }, [diagnostics, controlledQuery]);

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
    if (activeSlotIdx !== null) setActiveSlotIdx(null);
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

  const pending = useMemo((): { kind: 'query'; pills: QueryClause[] } | { kind: 'raw'; value: string } | { kind: 'text'; value: string } | { kind: 'invalid'; reason: string } | null => {
    const raw = freeText.trim();
    if (!raw) return null;
    const restored = wqlToPills(raw);
    if (restored) return { kind: 'query', pills: restored };
    const parsed = parseQuery(raw);
    // Valid WQL the pill model cannot express (e.g. a negated filter): the
    // box holds the query — Enter RUNS it, never degrades it to a text search.
    if (!parsed.error && /[:{]/.test(raw)) {
      return { kind: 'raw', value: raw };
    }
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

  const typeaheadMatches = useMemo(() => {
    if (typeaheadDismissed || rawEscape || activeSlotIdx !== null) return [];
    const sourceVal = pills.find((c) => c.type === 'source')?.value || 'notes';
    const allowed = allowedFilterTypesForSource(sourceVal);
    const pillIdxByType = new Map<string, number>();
    pills.forEach((c, i) => {
      if (!pillIdxByType.has(c.type)) pillIdxByType.set(c.type, i);
    });
    const candidates = (Object.keys(CLAUSE_META) as ClauseType[])
      .filter((type) => {
        if (CLAUSE_META[type].required) return false;
        if (hiddenTypes.has(type)) return false;
        // The plane selector is not in the filter allowlists (every query
        // has one) — it still proposes, always as an EDIT of the existing
        // source pill.
        if (type === 'source') return true;
        return allowed.has(type);
      })
      .map((type) => {
        const meta = CLAUSE_META[type];
        const pillIdx = pillIdxByType.get(type);
        return {
          type,
          label: meta.label,
          hint: meta.placeholder,
          icon: meta.icon,
          present: pillIdx !== undefined,
          pillIdx,
        };
      });
    return matchFilterTypeahead(freeText, candidates);
  }, [freeText, pills, hiddenTypes, typeaheadDismissed, rawEscape]);

  const acceptTypeahead = (match: (typeof typeaheadMatches)[number]) => {
    if (match.present && match.pillIdx !== undefined) {
      setActiveSlotIdx(match.pillIdx);
    } else {
      const meta = getClauseMeta(match.type);
      const next: QueryClause[] = [
        ...pills,
        {
          id: `c-${Date.now()}-${Math.random()}`,
          type: match.type,
          label: meta.label,
          value: '',
          inputType: meta.inputType,
          placeholder: meta.placeholder,
        },
      ];
      setPills(next);
      emitIfControlled(next);
      setActiveSlotIdx(next.length - 1);
    }
    setFreeText('');
    setEditorHighlight(0);
    inputRef.current?.focus();
  };

  // Live-search emission (#1010): debounced merged query — committed pills
  // plus the pending free text serialized as a text pill, i.e. the string
  // Enter would commit. Invalid mid-edit queries emit nothing, so hosts
  // filtering as-you-type keep their last results instead of flashing empty.
  useEffect(() => {
    if (!onLiveQueryChange) return;
    const timer = setTimeout(() => {
      const raw = freeText.trim();
      if (!raw) {
        // Controlled: emit the exact prop string so hidden clauses (source,
        // etc.) survive. Uncontrolled: fall back to the pill serialization.
        onLiveQueryChange(controlledQueryRef.current ?? pillsToWql(pills));
      } else if (pending?.kind === 'query') {
        onLiveQueryChange((pending.pills && pillsToWql(pending.pills)) || raw);
      } else if (pending?.kind === 'raw') {
        onLiveQueryChange(pending.value);
      } else if (pending?.kind === 'text') {
        onLiveQueryChange(pillsToWql([...pills, { id: 'wql-live-text', type: 'text', label: 'text', value: pending.value }]));
      }
    }, LIVE_QUERY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pills, freeText, pending, onLiveQueryChange]);

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

  // Active pill's condition editor: built-in clauses edit inline under the
  // composer box; custom slots keep their popover (the pill owns that).
  const editingClause = activeSlotIdx !== null ? pills[activeSlotIdx] : undefined;
  const editingCustom = editingClause ? Boolean(composerRegistry.getSlot(editingClause.type)) : false;
  const editing = Boolean(editingClause) && !editingCustom;
  const editorItems = useClauseItems(editingClause, freeText);

  const commitEditorValue = (value: string) => {
    if (activeSlotIdx === null) return;
    const clause = pills[activeSlotIdx];
    if (!clause) return;
    if (editorItems.isMulti) {
      const selected = editorItems.selectedValues;
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      updatePill(activeSlotIdx, { value: next.join('|') });
    } else {
      updatePill(activeSlotIdx, { value });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Value editing owns the keyboard while a pill editor is open: ↑↓ move
    // the option highlight, Enter sets/toggles, Backspace pops the last
    // multi value, Tab/Escape release the pill back to free typing. Keys
    // stop here so an embedding list (the palette's results, #834) does not
    // also navigate.
    if (editing) {
      const max = Math.max(0, editorItems.filteredItems.length - 1);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setEditorHighlight((i) => Math.min(i + 1, max));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setEditorHighlight((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const highlighted = editorItems.filteredItems[editorHighlight];
        if (highlighted) commitEditorValue(highlighted.value);
        else if (editorItems.canCommitTyped) commitEditorValue(editorItems.typedValue);
        return;
      }
      if (e.key === 'Backspace' && editorItems.isMulti && freeText === '' && editorItems.selectedValues.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        commitEditorValue(editorItems.selectedValues[editorItems.selectedValues.length - 1]!);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setActiveSlotIdx(null);
        setFreeText('');
        setEditorHighlight(0);
        return;
      }
      return;
    }
    if (e.key === 'Tab' && typeaheadMatches.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      acceptTypeahead(typeaheadMatches[0]!);
      return;
    }
    if (e.key === 'Escape' && typeaheadMatches.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setTypeaheadDismissed(true);
      return;
    }
    if (e.key !== 'Enter') return;
    if (freeText.trim()) {
      e.preventDefault();
      e.stopPropagation();
      if (pending?.kind === 'query') {
        setPills(pending.pills);
        emitIfControlled(pending.pills);
        setFreeText('');
      } else if (pending?.kind === 'raw') {
        onSubmit?.(pending.value);
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

  const diagnosticsBlock = showDiagnostics ? (
    <WqlDiagnosticsStrip
      diagnostics={diagnostics}
      offendingLabel={offendingLabel}
      stages={stages}
      hideSummary={diagnosticsPosition === 'top'}
      actions={
        <>
          <AddCalcDropdown clauses={pills} onAdd={addCalc} />
          <AddFilterDropdown clauses={pills} onAdd={addPill} hiddenTypes={hiddenTypes} />
          {diagnosticsActions}
        </>
      }
    />
  ) : (
    <div className="flex items-center justify-end gap-1.5 px-1.5" data-testid="wql-add-row">
      <AddCalcDropdown clauses={pills} onAdd={addCalc} />
      <AddFilterDropdown clauses={pills} onAdd={addPill} hiddenTypes={hiddenTypes} />
      {diagnosticsActions}
    </div>
  );

  return (
    <div className="space-y-1">
      {diagnosticsPosition === 'top' && diagnosticsBlock}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex flex-wrap items-center gap-1.5 min-h-[46px] rounded-xl border border-border bg-muted/20 px-3 py-1.5 text-xs transition-all cursor-text shadow-xs',
          activeSlotIdx !== null && 'border-primary/60 bg-background ring-2 ring-primary/20 shadow-md',
          className,
        )}
        data-testid="wql-composer"
      >
        <Command className="size-4 text-signal-caution shrink-0 mr-0.5" />

        {pills.map((pill, idx) =>
          hiddenTypes.has(pill.type) ? null : (
            <TokenSlotPill
              key={pill.id}
              clause={pill}
              isActive={activeSlotIdx === idx}
              invalid={diagnostics.offendingClauseId === pill.id}
              invalidReason={diagnostics.offendingClauseId === pill.id ? diagnostics.error : undefined}
              onClick={() => {
                setActiveSlotIdx(activeSlotIdx === idx ? null : idx);
                setFreeText('');
                setEditorHighlight(0);
                inputRef.current?.focus();
              }}
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
          placeholder={editing && editingClause ? getClauseMeta(editingClause.type).placeholder : placeholder}
          onChange={(e) => {
            setFreeText(e.target.value);
            setTypeaheadDismissed(false);
            if (editing) setEditorHighlight(0);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[140px] bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 font-mono"
          data-testid="wql-composer-input"
        />

        {customSlots}
      </div>

      {editing && editingClause && (
        <InlineClauseEditor
          clause={editingClause}
          filteredItems={editorItems.filteredItems}
          selectedValues={editorItems.selectedValues}
          isMulti={editorItems.isMulti}
          typedValue={editorItems.typedValue}
          canCommitTyped={editorItems.canCommitTyped}
          emptyText={editorItems.emptyText}
          highlightIdx={Math.min(editorHighlight, Math.max(0, editorItems.filteredItems.length - 1))}
          onHighlight={setEditorHighlight}
          onCommitValue={commitEditorValue}
          onCommitTyped={commitEditorValue}
        />
      )}

      {typeaheadMatches.length > 0 && (
        <div
          className="mx-0.5 rounded-xl border border-border bg-popover shadow-md p-1"
          data-testid="wql-filter-typeahead"
        >
          <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Add filter
          </div>
          {typeaheadMatches.slice(0, 6).map((m, i) => (
            <button
              key={m.type}
              type="button"
              data-testid={`wql-filter-typeahead-${m.type}`}
              onClick={() => acceptTypeahead(m)}
              className={cn(
                'flex w-full items-center gap-2 px-2 py-1.5 text-xs rounded-lg text-left transition-colors hover:bg-muted',
                i === 0 && 'bg-muted/60',
              )}
            >
              <span aria-hidden>{m.icon}</span>
              <span className="font-mono font-semibold">{m.type}</span>
              <span className="truncate text-muted-foreground">
                {m.present ? `edit — ${m.hint}` : m.hint}
              </span>
              {i === 0 && (
                <kbd className="ml-auto rounded border border-border bg-muted/60 px-1 text-[10px] text-muted-foreground">
                  Tab ↹
                </kbd>
              )}
            </button>
          ))}
        </div>
      )}

      {pending && !editing && (
        <div
          className={cn(
            'px-1.5 text-[11px] font-mono',
            pending.kind === 'invalid' ? 'text-destructive' : 'text-muted-foreground',
          )}
          data-testid="wql-composer-pending"
          role={pending.kind === 'invalid' ? 'alert' : undefined}
        >
          {pending.kind === 'query' && '↵ Use as query'}
          {pending.kind === 'raw' && '↵ Run query'}
          {pending.kind === 'text' && `↵ Search text: ${pending.value}`}
          {pending.kind === 'invalid' && pending.reason}
        </div>
      )}

      {diagnosticsPosition !== 'top' && diagnosticsBlock}
    </div>
  );
}
