/**
 * InlineClauseEditor — the composer's in-card value editor. Rendered under
 * the composer box for the active pill: the composer owns this surface and
 * routes ↑/↓/Enter from the focused search input. Nothing here portals or
 * autofocuses; Tab is native and moves real focus out of the composer.
 *
 * ARIA relation: with `listId` the list is a labelled listbox whose rows
 * carry stable ids (`clauseOptionId`), so the combobox input can point at it
 * via aria-controls/aria-activedescendant. `highlightIdx === -1` means no
 * active row; `filteredItems.length` addresses the typed-exact row, which is
 * a real indexed option row after the filtered items.
 *
 * Presentational: the composer resolves options (useClauseItems) and owns
 * the highlight index + commits.
 */
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react';
import { cn } from '../utils/cn';
import type { QueryClause } from './queryClauses';
import { getClauseMeta } from './queryClauses';

/** Stable option row id shared with the combobox input's
 *  aria-activedescendant. The typed-exact row renders at index
 *  `filteredItems.length`. */
export function clauseOptionId(listId: string | undefined, idx: number): string | undefined {
  return listId ? `${listId}-option-${idx}` : undefined;
}

export interface InlineClauseEditorProps {
  clause: QueryClause;
  filteredItems: { value: string; label: string }[];
  selectedValues: string[];
  isMulti: boolean;
  typedValue: string;
  canCommitTyped: boolean;
  emptyText: string | null;
  /** -1 = no active row; otherwise the rendered index (typed row = filteredItems.length). */
  highlightIdx: number;
  onHighlight: (idx: number) => void;
  onCommitValue: (value: string) => void;
  onCommitTyped: (value: string) => void;
  /** Listbox id for the composer input's aria-controls/aria-activedescendant. */
  listId?: string;
  /** Explicit multi-select finish (Done). Single-select closes on commit. */
  onDone?: () => void;
  /** Ordered multi-select (groupby dims): receive the reordered dimension list. */
  onReorder?: (values: string[]) => void;
}

export function InlineClauseEditor({
  clause,
  filteredItems,
  selectedValues,
  isMulti,
  typedValue,
  canCommitTyped,
  emptyText,
  highlightIdx,
  onHighlight,
  onCommitValue,
  onCommitTyped,
  listId,
  onDone,
  onReorder,
}: InlineClauseEditorProps) {
  const meta = getClauseMeta(clause.type);
  const current = clause.value.trim();
  const typedIdx = filteredItems.length;
  // The committed value strip always shows what the clause holds — for
  // single-select that is the current value itself.
  const shownValues = selectedValues.length > 0
    ? selectedValues
    : !isMulti && current ? [current] : [];

  const reorder = (i: number, dir: -1 | 1) => {
    if (!onReorder) return;
    const to = i + dir;
    if (to < 0 || to >= selectedValues.length) return;
    const next = [...selectedValues];
    [next[i], next[to]] = [next[to]!, next[i]!];
    onReorder(next);
  };

  return (
    <div
      className="mx-0.5 rounded-xl border border-border bg-popover shadow-md p-1"
      data-testid="wql-clause-editor"
      data-clause-type={clause.type}
    >
      <div className="flex items-center gap-2 px-2 pt-1 pb-1.5">
        <span aria-hidden className="text-[11px]">{meta.icon}</span>
        <span className="text-[11px] font-semibold text-foreground font-mono">{meta.label}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/70 font-mono truncate">
          ↑↓ move · Enter {isMulti ? 'add/remove' : 'set'} · Esc done · Tab exits
        </span>
      </div>

      {shownValues.length > 0 && (
        <div className={cn('px-2 pb-1.5', isMulti && 'border-b border-border/50')}>
          <div className="flex flex-wrap gap-1">
            {shownValues.map((v, i) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono min-h-11"
            >
              <span className="max-w-40 truncate">{v}</span>
              {onReorder && shownValues.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label={`Move ${v} up`}
                    disabled={i === 0}
                    onClick={() => reorder(i, -1)}
                    className="px-0.5 hover:text-foreground disabled:opacity-30 min-h-11 min-w-11"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${v} down`}
                    disabled={i === shownValues.length - 1}
                    onClick={() => reorder(i, 1)}
                    className="px-0.5 hover:text-foreground disabled:opacity-30 min-h-11 min-w-11"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </>
              )}
              {isMulti && (
                <button
                  type="button"
                  onClick={() => onCommitValue(v)}
                  aria-label={`Remove ${v}`}
                  className="hover:text-destructive min-h-11 min-w-11 -mr-1.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
            ))}
          </div>
          {isMulti && (
            <p className="pt-1 text-[10px] text-muted-foreground" data-testid="wql-clause-editor-multi-hint">
              {clause.type === 'groupby' ? 'Group in this order.' : 'Match any selected value (OR).'}
            </p>
          )}
        </div>
      )}

      <div
        id={listId}
        role="listbox"
        aria-label={`${meta.label} options`}
        aria-multiselectable={isMulti || undefined}
        className="max-h-44 overflow-y-auto flex flex-col gap-0.5"
      >
        {canCommitTyped && (
          <button
            type="button"
            role="option"
            aria-selected={false}
            id={clauseOptionId(listId, typedIdx)}
            data-active={highlightIdx === typedIdx || undefined}
            onMouseEnter={() => onHighlight(typedIdx)}
            onClick={() => onCommitTyped(typedValue)}
            data-testid={`clause-commit-typed-${clause.type}`}
            className={cn(
              'flex items-center justify-between px-2 py-1 text-xs text-left rounded hover:bg-muted/60 transition-colors font-mono min-h-12',
              highlightIdx === typedIdx && 'bg-muted/60',
            )}
          >
            <span className="truncate">
              Search for <span className="font-semibold">&ldquo;{typedValue}&rdquo;</span>
            </span>
            <span className="text-muted-foreground/60 ml-1 shrink-0">↵</span>
          </button>
        )}
        {filteredItems.map((item, idx) => {
          const selected = selectedValues.includes(item.value) || (!isMulti && current === item.value);
          const active = idx === highlightIdx;
          return (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={selected}
              id={clauseOptionId(listId, idx)}
              data-active={active || undefined}
              data-testid={`wql-clause-editor-${clause.type}-opt-${idx}`}
              onMouseEnter={() => onHighlight(idx)}
              onClick={() => onCommitValue(item.value)}
              className={cn(
                'flex items-center justify-between px-2 py-1 text-xs text-left rounded transition-colors font-mono min-h-12',
                active ? 'bg-primary/15 font-semibold' : 'hover:bg-muted/60',
                selected && 'text-primary',
              )}
            >
              <span className="truncate">{item.label}</span>
              {selected && <Check className="w-3 h-3 shrink-0" />}
            </button>
          );
        })}
        {emptyText && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground italic">{emptyText}</div>
        )}
      </div>

      {isMulti && onDone && (
        <div className="flex justify-end px-2 pt-1.5">
          <button
            type="button"
            onClick={onDone}
            data-testid="wql-clause-editor-done"
            className="inline-flex items-center min-h-12 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Done{shownValues.length > 0 ? ` · ${shownValues.length} selected` : ''}
          </button>
        </div>
      )}
    </div>
  );
}
