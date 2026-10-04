import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { TokenSlotPill } from './QueryPalette';
import { InlineClauseEditor } from './InlineClauseEditor';
import { useClauseItems } from './clauseItems';
import { composerRegistry, useComposerSlots } from './ComposerRegistry';
import { WqlDiagnosticsStrip } from './WqlDiagnosticsStrip';
import { useWqlStageCounts, DEFAULT_DIAGNOSTICS_DEBOUNCE_MS, type WqlExecutor, type WqlStageCounts, type AnyParsedQuery } from './useWqlStageCounts';
import { CLAUSE_META, CONTENT_GROUPING_DIMENSIONS, getClauseMeta, allowedFilterTypesForTarget, type ClauseType, type QueryClause } from './queryClauses';
import { astToPills, editQueryClause, pivotQuery, resolveQueryDraft, type QueryDraft } from './queryAst';
import { useSuggestionBoundTypes } from './suggestionSources';
import { WqlTextEditor } from './WqlTextEditor';

export interface WqlValidationState {
  valid: boolean;
  error?: string;
}

export interface WqlComposerProps {
  initialQuery?: string;
  defaultQuery?: string;
  query?: string;
  /** Synchronous resolved draft, including invalid exact text. Execution debounce belongs to the host. */
  onQueryChange?: (wql: string) => void;
  onValidationChange?: (state: WqlValidationState) => void;
  onAstChange?: (ast: AnyParsedQuery) => void;
  /** Explicit actions receive the current valid draft on the first activation. */
  onSubmit?: (wql: string) => void;
  actionLabel?: string;
  compact?: boolean;
  showDiagnostics?: boolean;
  diagnosticsPosition?: 'top' | 'bottom';
  execute?: WqlExecutor;
  /** Reuse host execution counts instead of running another query. */
  stages?: WqlStageCounts;
  debounceMs?: number;
  customSlots?: ReactNode;
  diagnosticsActions?: ReactNode;
  hiddenClauseTypes?: ClauseType[];
  /** Priority only; valid choices are never excluded by favorites. */
  preferredChoices?: readonly string[];
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

type ActiveEditor =
  | { kind: 'closed' }
  | { kind: 'catalog' }
  | { kind: 'value'; clause: QueryClause }
  | { kind: 'wql' };

export function WqlComposer({
  initialQuery, defaultQuery, query, onQueryChange, onValidationChange, onAstChange, onSubmit, actionLabel,
  compact = false, showDiagnostics = true, diagnosticsPosition = 'bottom', execute, stages: suppliedStages,
  debounceMs = DEFAULT_DIAGNOSTICS_DEBOUNCE_MS, customSlots, diagnosticsActions,
  hiddenClauseTypes, preferredChoices, autoFocus = false, placeholder = 'Search text or enter WQL', className,
}: WqlComposerProps) {
  const [desktop, setDesktop] = useState(false);
  const [base, setBase] = useState(query ?? initialQuery ?? defaultQuery ?? 'find:note');
  const [pending, setPending] = useState('');
  const [active, setActive] = useState<ActiveEditor>({ kind: 'closed' });
  const [search, setSearch] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const [error, setError] = useState<string>();
  const [undo, setUndo] = useState<string>();
  const [pivot, setPivot] = useState<{ draft: QueryDraft; removed: string[] }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const emittedRef = useRef(query ?? initialQuery ?? defaultQuery ?? 'find:note');
  const queryRef = useRef(query);
  const currentRef = useRef(resolveQueryDraft(base));
  const callbacks = useRef({ onQueryChange, onValidationChange, onAstChange });
  callbacks.current = { onQueryChange, onValidationChange, onAstChange };
  const id = useId();
  const listId = `${id}-options`;
  const slots = useComposerSlots();
  const boundTypes = useSuggestionBoundTypes();
  const external = query !== undefined && query !== queryRef.current && query !== emittedRef.current;
  const resolved = useMemo(() => resolveQueryDraft(external ? query : base, external ? '' : pending), [base, pending, external, query]);
  currentRef.current = resolved;
  const pills = useMemo(() => astToPills(resolved.ast) ?? [], [resolved.ast]);
  const guided = resolved.valid && astToPills(resolved.ast) !== null;
  const hidden = new Set<string>(hiddenClauseTypes);
  const editorClause = active.kind === 'value' ? active.clause : undefined;
  const customEditor = editorClause ? composerRegistry.getSlot(editorClause.type) : undefined;
  const supportedValues = editorClause?.type === 'groupby' && resolved.ast.family === 'find' && ['note', 'block'].includes(resolved.ast.target) ? CONTENT_GROUPING_DIMENSIONS : undefined;
  const values = useClauseItems(editorClause, search, { supportedValues });
  const preferredItems = [...values.filteredItems].sort((a, b) => {
    const ai = preferredChoices?.indexOf(a.value) ?? -1;
    const bi = preferredChoices?.indexOf(b.value) ?? -1;
    return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
  });
  const allowed = allowedFilterTypesForTarget(resolved.ast.family === 'find' ? resolved.ast.target : '', resolved.ast.family);
  const factTarget = resolved.ast.family === 'aggregate' || ['segment', 'event'].includes(resolved.ast.target);
  const dynamicTypes = factTarget ? boundTypes.filter((type) => !(type in CLAUSE_META)) : [];
  const catalog = [...Object.keys(CLAUSE_META), ...dynamicTypes, ...slots.map((slot) => slot.type)]
    .filter((type, index, all) => all.indexOf(type) === index && !hidden.has(type))
    .filter((type) => ['kind', 'target'].includes(type) || allowed.has(type) || dynamicTypes.includes(type) || slots.some((slot) => slot.type === type))
    .filter((type) => type !== 'target' || resolved.ast.family === 'find')
    .filter((type) => type !== 'pipes' && type !== 'where')
    .filter((type) => type.toLowerCase().includes((active.kind === 'catalog' ? search : pending).toLowerCase()) || getClauseMeta(type).label.toLowerCase().includes((active.kind === 'catalog' ? search : pending).toLowerCase()))
    .sort((a, b) => Number(b.startsWith(active.kind === 'catalog' ? search : pending)) - Number(a.startsWith(active.kind === 'catalog' ? search : pending)));
  const suggesting = active.kind === 'closed' && pending.trim() !== '' && catalog.length > 0 && !/[{}:]/.test(pending);
  const catalogOpen = active.kind === 'catalog' || suggesting;
  const textAction = suggesting || allowed.has('text');
  const optionCount = active.kind === 'value' ? values.filteredItems.length + Number(values.canCommitTyped) : catalog.length + Number(textAction);
  const countedStages = useWqlStageCounts(resolved.ast, resolved.valid && !error, suppliedStages ? undefined : execute, debounceMs);
  const stages = suppliedStages ?? countedStages;

  useEffect(() => {
    if (query === undefined || query === queryRef.current) return;
    queryRef.current = query;
    if (query === emittedRef.current) return;
    emittedRef.current = query;
    setBase(query);
    setPending('');
    setActive({ kind: 'closed' });
    setSearch('');
    setHighlight(-1);
    setError(undefined);
    setPivot(undefined);
  }, [query]);

  useEffect(() => {
    callbacks.current.onValidationChange?.({ valid: resolved.valid && !error && !pivot, error: error ?? resolved.error ?? (pivot ? 'Confirm or cancel the query change' : undefined) });
    callbacks.current.onAstChange?.(resolved.ast);
  }, [resolved, error, pivot]);

  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 640px)');
    if (!media) return;
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (active.kind === 'catalog' || active.kind === 'value') pickerRef.current?.focus();
  }, [active.kind]);

  useEffect(() => {
    if (highlight >= 0) document.getElementById(`${listId}-option-${highlight}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight, listId]);

  const notify = (draft: QueryDraft) => {
    currentRef.current = draft;
    const changed = draft.wql !== emittedRef.current;
    emittedRef.current = draft.wql;
    callbacks.current.onValidationChange?.({ valid: draft.valid, error: draft.error });
    callbacks.current.onAstChange?.(draft.ast);
    if (changed) callbacks.current.onQueryChange?.(draft.wql);
  };

  const commit = (draft: QueryDraft) => {
    setBase(draft.wql);
    setPending('');
    setError(undefined);
    notify(draft);
  };

  const closeEditor = () => {
    setActive({ kind: 'closed' });
    setSearch('');
    setHighlight(-1);
    setError(undefined);
    if (openerRef.current?.isConnected) openerRef.current.focus();
    else inputRef.current?.closest('[data-testid="wql-composer-root"]')?.querySelector<HTMLElement>('[data-testid="add-filter-button"]')?.focus();
  };

  const openEditor = (clause: QueryClause) => {
    if (pending && currentRef.current.valid) commit(currentRef.current);
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (clause.type === 'where' || clause.type === 'pipes') {
      setActive({ kind: 'wql' });
      commit(currentRef.current);
    } else {
      setActive({ kind: 'value', clause });
      setSearch('');
    }
    setHighlight(-1);
    setError(undefined);
  };

  const openField = (type: string) => {
    const existing = pills.find((pill) => pill.type === type);
    if (pending) commit(resolveQueryDraft(base));
    openEditor(existing ?? { id: `new-${type}`, type, ...getClauseMeta(type), value: '' });
  };

  const updateClause = (clause: QueryClause, value: string | null) => {
    if (clause.type === 'kind' || clause.type === 'target') {
      const next = pivotQuery(currentRef.current.wql, clause.type, value ?? '');
      if (!next.draft.valid) { setError(next.draft.error); return; }
      if (next.removed.length) { setPivot(next); return; }
      commit(next.draft);
      closeEditor();
      return;
    }
    const next = editQueryClause(currentRef.current.wql, clause, value);
    if (!next.valid) { setError(next.error); return; }
    commit(next);
    if (active.kind === 'value') {
      const previousIndex = clause.filterIndex;
      const updated = astToPills(next.ast)?.find((pill) => previousIndex !== undefined ? pill.filterIndex === previousIndex && Boolean(value) : pill.type === clause.type);
      setActive({ kind: 'value', clause: updated ?? { ...clause, value: value ?? '', filterIndex: undefined } });
    }
  };

  const chooseValue = (value: string) => {
    if (active.kind !== 'value') return;
    if (values.isMulti) {
      const selected = values.selectedValues;
      const wildcard = active.clause.value !== '' && active.clause.value.split('|').every((item) => item.endsWith('*'));
      const picked = wildcard && !value.endsWith('*') ? `${value}*` : value;
      updateClause(active.clause, (selected.includes(picked) ? selected.filter((item) => item !== picked) : [...selected, picked]).join('|'));
    } else {
      const next = editQueryClause(currentRef.current.wql, active.clause, value);
      if (!next.valid) { setError(next.error); return; }
      updateClause(active.clause, value);
      if (!['kind', 'target'].includes(active.clause.type)) closeEditor();
    }
  };

  const submit = () => {
    const draft = currentRef.current;
    if (!draft.valid || error || pivot) return;
    commit(draft);
    onSubmit?.(draft.wql);
  };

  const handleKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault(); event.stopPropagation(); submit(); return;
    }
    if (event.key === 'Escape') {
      if (pivot) { event.preventDefault(); event.stopPropagation(); setPivot(undefined); return; }
      if (active.kind !== 'closed') { event.preventDefault(); event.stopPropagation(); closeEditor(); return; }
      if (suggesting) { event.preventDefault(); event.stopPropagation(); commit(currentRef.current); setHighlight(-1); return; }
    }
    if (active.kind === 'value' && event.currentTarget instanceof HTMLInputElement && event.currentTarget === inputRef.current) {
      if (['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) event.stopPropagation();
      if (event.key === 'Enter') { event.preventDefault(); submit(); }
      return;
    }
    if ((active.kind === 'value' || catalogOpen) && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      setHighlight((index) => event.key === 'ArrowDown' ? (index + 1) % optionCount : (index <= 0 ? optionCount - 1 : index - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault(); event.stopPropagation();
      if (highlight >= 0 && catalogOpen && catalog[highlight]) openField(catalog[highlight]);
      else if (catalogOpen && textAction && highlight === catalog.length) {
        if (suggesting) submit();
        else openEditor({ id: 'new-text', type: 'text', ...getClauseMeta('text'), value: '' });
      }
      else if (active.kind === 'value') {
        if (highlight >= 0 && highlight < preferredItems.length) chooseValue(preferredItems[highlight].value);
        else if (values.canCommitTyped && (highlight === preferredItems.length || highlight < 0)) chooseValue(values.typedValue);
        else if (search && !values.openSlot) setError(`Unknown ${getClauseMeta(active.clause.type).label} value`);
      } else submit();
      return;
    }
    if (event.key === 'Backspace' && active.kind === 'closed' && !pending) {
      const visible = Array.from(event.currentTarget.closest('[data-testid="wql-composer-root"]')?.querySelectorAll<HTMLElement>('[data-testid^="token-slot-"]:not([data-testid^="token-slot-remove-"]):not([data-testid^="token-slot-value-"])') ?? []);
      visible.at(-1)?.focus();
    }
  };

  const action = <>{actionLabel && <button type="button" onClick={submit} disabled={!resolved.valid || Boolean(error) || Boolean(pivot)} className="min-h-12 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">{actionLabel}</button>}{diagnosticsActions}</>;
  const diagnostics = { ...resolved, valid: resolved.valid && !error, error: error ?? resolved.error };

  return (
    <div className={cn('min-w-0 space-y-2', desktop && compact && 'flex flex-wrap items-center gap-2 space-y-0 [&>:not([data-wql-inline])]:w-full', className)} data-testid="wql-composer-root">
      {diagnosticsPosition === 'top' && showDiagnostics && <WqlDiagnosticsStrip diagnostics={diagnostics} stages={stages} actions={action} variant="header" />}
      {(desktop || active.kind === 'wql' || !guided) && <div data-wql-inline className={cn('min-w-0', desktop && compact ? 'flex-1' : 'w-full')}><WqlTextEditor value={resolved.wql} placeholder={placeholder} onChange={(text) => commit(resolveQueryDraft(text))} onSubmit={submit} onEscape={() => { if (active.kind === 'closed') return false; closeEditor(); return true; }} autoFocus={autoFocus} /></div>}
      <div className={cn('flex min-w-0 flex-wrap items-center gap-1', !desktop && 'rounded-xl border border-border p-2', desktop && compact && 'hidden')} data-testid="wql-composer" onKeyDown={(event) => {
        if (!['Delete', 'Backspace'].includes(event.key) || !(event.target instanceof HTMLButtonElement)) return;
        const buttons = Array.from(event.currentTarget.querySelectorAll('[data-testid^="token-slot-"]:not([data-testid^="token-slot-remove-"]):not([data-testid^="token-slot-value-"])'));
        const pill = pills.filter((item) => !hidden.has(item.type))[buttons.indexOf(event.target)];
        if (!pill || ['kind', 'target', 'agg', 'metric'].includes(pill.type)) return;
        event.preventDefault(); event.stopPropagation();
        setUndo(currentRef.current.wql);
        updateClause(pill, null);
        inputRef.current?.focus();
      }}>
        {guided && active.kind !== 'wql' && pills.filter((pill) => !hidden.has(pill.type)).map((pill) => <TokenSlotPill key={pill.id} clause={pill} compact={compact} isActive={active.kind === 'value' && active.clause.id === pill.id} onClick={() => openEditor(pill)} onRemove={['kind', 'target', 'agg', 'metric'].includes(pill.type) ? undefined : () => { setUndo(currentRef.current.wql); updateClause(pill, null); }} />)}
        {!desktop && active.kind !== 'wql' && guided && <input ref={inputRef} type="text" role="combobox" aria-label="Search text or WQL" aria-controls={suggesting ? listId : undefined} aria-expanded={suggesting} aria-activedescendant={suggesting && highlight >= 0 ? `${listId}-option-${highlight}` : undefined} value={pending} placeholder={placeholder} onChange={(event) => { const text = event.target.value; setPending(text); setHighlight(-1); setError(undefined); notify(resolveQueryDraft(base, text)); }} onKeyDown={handleKeys} className="min-h-12 min-w-0 flex-[1_1_140px] bg-transparent font-mono text-base outline-none" data-testid="wql-composer-input" />}
        {customSlots}
      </div>
      <div data-wql-inline={desktop && compact ? '' : undefined} className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!guided} aria-haspopup="listbox" aria-expanded={active.kind === 'catalog'} aria-controls={active.kind === 'catalog' ? listId : undefined} onClick={() => { openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setActive({ kind: 'catalog' }); setSearch(''); setHighlight(-1); }} className="min-h-12 rounded-lg border border-border px-3" data-testid="add-filter-button">Add condition</button>
        {!desktop && <button type="button" onClick={() => { commit(currentRef.current); if (active.kind === 'wql') closeEditor(); else setActive({ kind: 'wql' }); }} disabled={active.kind === 'wql' && !guided} className="min-h-12 rounded-lg px-3">{active.kind === 'wql' ? 'Guided controls' : 'Edit WQL'}</button>}
        {undo && <button type="button" onClick={() => { commit(resolveQueryDraft(undo)); setUndo(undefined); }} className="min-h-12 px-3">Undo removal</button>}
      </div>
      {(active.kind === 'value' || active.kind === 'catalog') && <div data-testid="wql-field-picker" className="min-w-0 rounded-xl border border-border p-2 focus-within:ring-2 focus-within:ring-ring" onKeyDown={(event) => { if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) handleKeys(event); }}>
        <button type="button" onClick={closeEditor} className="min-h-12 px-3">Back</button>
        <label className="block text-sm">Search {active.kind === 'value' ? getClauseMeta(active.clause.type).label : 'conditions'}
          <input ref={pickerRef} type="search" role="combobox" aria-label={active.kind === 'value' ? `Search ${getClauseMeta(active.clause.type).label}` : 'Search conditions'} aria-controls={listId} aria-expanded="true" aria-activedescendant={highlight >= 0 ? `${listId}-option-${highlight}` : undefined} value={search} onChange={(event) => { setSearch(event.target.value); setHighlight(-1); setError(undefined); }} onKeyDown={handleKeys} className="min-h-12 w-full rounded border border-border bg-background px-3 text-base" data-testid="wql-picker-search" />
        </label>
        {active.kind === 'value' && active.clause.filterIndex !== undefined && <div className="flex flex-wrap gap-2">
          <label className="flex min-h-12 items-center gap-2"><input type="checkbox" checked={active.clause.negate ?? false} onChange={(event) => updateClause({ ...active.clause, negate: event.target.checked }, active.clause.value)} />Exclude</label>
          <label className="flex min-h-12 items-center gap-2"><input type="checkbox" checked={active.clause.value.split('|').every((value) => value.endsWith('*'))} onChange={(event) => updateClause(active.clause, active.clause.value.split('|').map((value) => `${value.replace(/\*$/, '')}${event.target.checked ? '*' : ''}`).join('|'))} />Starts with</label>
        </div>}
        {active.kind === 'value' && active.clause.type === 'time' && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label>Start date<input type="date" aria-label="Start date" className="min-h-12 w-full bg-background text-base" onChange={(event) => { const end = currentRef.current.ast.window; updateClause(active.clause, `from ${event.target.value}${end?.kind === 'range' && end.end ? ` to ${end.end}` : ''}`); }} value={resolved.ast.window?.kind === 'range' ? resolved.ast.window.start : ''} /></label>
          <label>End date<input type="date" aria-label="End date" className="min-h-12 w-full bg-background text-base" onChange={(event) => { const window = currentRef.current.ast.window; if (window?.kind === 'range') updateClause(active.clause, `from ${window.start}${event.target.value ? ` to ${event.target.value}` : ''}`); else setError('Choose a start date first'); }} value={resolved.ast.window?.kind === 'range' ? resolved.ast.window.end ?? '' : ''} /></label>
        </div>}
        {active.kind === 'value' && (customEditor ? <customEditor.Editor value={customEditor.parseValue ? customEditor.parseValue(active.clause.value) : active.clause.value} onChange={(value) => updateClause(active.clause, customEditor.formatValue ? customEditor.formatValue(value) : String(value))} onClose={closeEditor} /> : <InlineClauseEditor clause={active.clause} filteredItems={preferredItems} selectedValues={values.selectedValues} isMulti={values.isMulti} typedValue={values.typedValue} canCommitTyped={values.canCommitTyped} emptyText={values.emptyText} highlightIdx={highlight} onHighlight={setHighlight} onCommitValue={chooseValue} onCommitTyped={chooseValue} listId={listId} onDone={closeEditor} onReorder={(dimensions) => updateClause(active.clause, dimensions.join('|'))} />)}
      </div>}
      {catalogOpen && <div id={listId} role="listbox" aria-label="Query conditions" className="max-h-64 overflow-y-auto rounded-xl border border-border p-1" data-testid="wql-filter-typeahead">
        {catalog.map((type, index) => <button key={type} id={`${listId}-option-${index}`} type="button" role="option" aria-selected={false} onMouseEnter={() => setHighlight(index)} onClick={() => openField(type)} className={cn('flex min-h-12 w-full items-center gap-2 rounded px-3 text-left', index === highlight && 'bg-muted')} data-testid={`wql-filter-typeahead-${type}`}><span>{pills.some((pill) => pill.type === type) ? 'Edit' : 'Add'} {getClauseMeta(type).label}</span><span className="text-xs text-muted-foreground">{type}</span></button>)}
        {textAction && <button id={`${listId}-option-${catalog.length}`} type="button" role="option" aria-selected={false} onMouseEnter={() => setHighlight(catalog.length)} className={cn('min-h-12 w-full rounded px-3 text-left', highlight === catalog.length && 'bg-muted')} onClick={() => suggesting ? submit() : openEditor({ id: 'new-text', type: 'text', ...getClauseMeta('text'), value: '' })}>{suggesting ? `Search text ${pending}` : 'Add another text condition'}</button>}
      </div>}
      {pivot && <div role="alertdialog" aria-label="Confirm query pivot" className="rounded-xl border border-border p-3"><p>Changing the query removes incompatible clauses:</p><ul>{pivot.removed.map((item) => <li key={item}>{item}</li>)}</ul><button type="button" className="min-h-12 px-3" onClick={() => setPivot(undefined)}>Cancel</button><button type="button" className="min-h-12 px-3" onClick={() => { commit(pivot.draft); setPivot(undefined); closeEditor(); }}>Change query</button></div>}
      {!showDiagnostics && (error ?? resolved.error) && <p role="alert" className="text-sm text-destructive">{error ?? resolved.error}</p>}
      {!guided && !resolved.error && <p className="text-sm text-muted-foreground">Use Edit WQL to preserve every clause.</p>}
      {defaultQuery && <p className="text-sm text-muted-foreground">Example WQL: <code>{defaultQuery}</code></p>}
      {pending && <p className="text-sm text-muted-foreground" data-testid="wql-composer-pending">{resolved.valid ? 'Current draft includes this text' : resolved.error}</p>}
      {showDiagnostics && diagnosticsPosition === 'bottom' ? <WqlDiagnosticsStrip diagnostics={diagnostics} stages={stages} actions={action} /> : diagnosticsPosition !== 'top' || !showDiagnostics ? <div className="flex flex-wrap items-center justify-end gap-2">{action}</div> : null}
    </div>
  );
}
