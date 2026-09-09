/**
 * InlineClauseEditor — the composer's in-card value editor. Rendered under
 * the composer box for the active pill instead of a popover: the palette
 * (a Radix dialog) owns focus, so the editor never portals — the composer
 * input keeps focus and routes ↑/↓/Enter/Tab to this list, giving the
 * palette's unified "options in the list" feel (Enter toggles multi values
 * or sets single values; Tab releases the pill back to free typing).
 *
 * Presentational: the composer resolves options (useClauseItems) and owns
 * the highlight index + commits.
 */
import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../utils/cn';
import type { QueryClause } from './queryClauses';
import { getClauseMeta } from './queryClauses';

export interface InlineClauseEditorProps {
  clause: QueryClause;
  filteredItems: { value: string; label: string }[];
  selectedValues: string[];
  isMulti: boolean;
  typedValue: string;
  canCommitTyped: boolean;
  emptyText: string | null;
  highlightIdx: number;
  onHighlight: (idx: number) => void;
  onCommitValue: (value: string) => void;
  onCommitTyped: (value: string) => void;
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
}: InlineClauseEditorProps) {
  const meta = getClauseMeta(clause.type);
  const current = clause.value.trim();

  return (
    <div
      className="mx-0.5 rounded-xl border border-border bg-popover shadow-md p-1"
      role="listbox"
      aria-multiselectable={isMulti || undefined}
      data-testid="wql-clause-editor"
      data-clause-type={clause.type}
    >
      <div className="flex items-center gap-2 px-2 pt-1 pb-1.5">
        <span aria-hidden className="text-[11px]">{meta.icon}</span>
        <span className="text-[11px] font-semibold text-foreground font-mono">{meta.label}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/70 font-mono truncate">
          ↑↓ move · Enter {isMulti ? 'add/remove' : 'set'} · Tab done
        </span>
      </div>

      {isMulti && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-1.5 border-b border-border/50">
          {selectedValues.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono"
            >
              {v}
              <button
                type="button"
                onClick={() => onCommitValue(v)}
                className="hover:text-destructive"
                aria-label={`Remove ${v}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5">
        {canCommitTyped && (
          <button
            type="button"
            onClick={() => onCommitTyped(typedValue)}
            className={cn(
              'flex items-center justify-between px-2 py-1 text-xs text-left rounded hover:bg-muted/60 transition-colors font-mono',
              highlightIdx === -1 && 'bg-muted/60',
            )}
            data-testid={`clause-commit-typed-${clause.type}`}
          >
            <span className="truncate">
              Search for <span className="font-semibold">&ldquo;{typedValue}&rdquo;</span>
            </span>
            <span className="text-muted-foreground/60 ml-1 shrink-0">↵</span>
          </button>
        )}
        {filteredItems.map((item, idx) => {
          const selected = selectedValues.includes(item.value) || (!isMulti && current === item.value);
          return (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={selected}
              data-testid={`wql-clause-editor-${clause.type}-opt-${idx}`}
              onMouseEnter={() => onHighlight(idx)}
              onClick={() => onCommitValue(item.value)}
              className={cn(
                'flex items-center justify-between px-2 py-1 text-xs text-left rounded transition-colors font-mono',
                idx === highlightIdx ? 'bg-primary/15 font-semibold' : 'hover:bg-muted/60',
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
    </div>
  );
}

export type { ReactNode };
