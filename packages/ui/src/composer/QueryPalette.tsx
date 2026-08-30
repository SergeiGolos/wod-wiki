import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { KeyboardEvent, ReactNode, Ref } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, ChevronDown, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { composerRegistry, useComposerSlots, type CustomSlotDefinition } from './ComposerRegistry';
import { useSuggestions } from './useSuggestions';
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
  getClauseMeta,
  sourcePlane,
  allowedFilterTypesForSource,
  SOURCE_OPTIONS,
  TIME_OPTIONS,
  AGG_OPTIONS,
  ROLLUP_OPTIONS,
  GROUPBY_OPTIONS,
  METRIC_OPTIONS,
  UNIT_OPTIONS,
} from './queryClauses';
import { WQL_INTENSITY_TIERS } from '@bitcobblers/wod-wiki-wql';

export interface TokenSlotPillProps {
  clause: QueryClause;
  isActive?: boolean;
  invalid?: boolean;
  invalidReason?: string;
  onClick?: () => void;
  onRemove?: () => void;
  onChange?: (patch: Partial<QueryClause>) => void;
  compact?: boolean;
  placeholderOverride?: string;
}

export function TokenSlotPill({
  clause,
  isActive,
  invalid = false,
  invalidReason,
  onClick,
  onRemove,
  onChange,
  compact = false,
  placeholderOverride,
}: TokenSlotPillProps) {
  const meta = getClauseMeta(clause.type);
  const customDef = composerRegistry.getSlot(clause.type);
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  const hasValue = Boolean(clause.value && clause.value.trim());

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (!open) setOpen(true);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setOpen((o) => !o);
    } else if (e.key === 'Escape') {
      if (!open) return;
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <div
        ref={pillRef}
        data-testid={`token-slot-${clause.type}`}
        role="button"
        tabIndex={0}
        onClick={() => {
          onClick?.();
          setOpen((o) => !o);
        }}
        onKeyDown={handleKeyDown}
        title={invalid ? invalidReason : undefined}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer select-none border',
          invalid
            ? 'bg-destructive/10 text-destructive border-destructive/40 hover:bg-destructive/20'
            : isActive
              ? 'bg-primary text-primary-foreground border-primary font-medium shadow-sm'
              : hasValue
                ? 'bg-muted/80 text-foreground border-border hover:bg-muted'
                : 'bg-muted/40 text-muted-foreground border-dashed border-border hover:bg-muted/60',
          compact && 'px-2 py-0.5 text-[11px]',
        )}
      >
        <span className="text-[10px] opacity-70">{meta.icon}</span>
        <span className="font-semibold text-[11px] opacity-90">{meta.label}:</span>
        <span data-testid={`token-slot-value-${clause.type}`} className={cn('truncate max-w-44', !hasValue && 'italic opacity-60')}>
          {hasValue ? clause.value : placeholderOverride || meta.placeholder}
        </span>
        {onRemove && !meta.required && (
          <button
            type="button"
            data-testid={`token-slot-remove-${clause.type}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 p-0.5 rounded-full hover:bg-black/10 text-inherit opacity-70 hover:opacity-100"
            title={`Remove ${meta.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && onChange && (customDef ? (
        <CustomSlotPopover
          clause={clause}
          anchor={pillRef.current}
          definition={customDef}
          onClose={() => setOpen(false)}
          onChange={(val) => {
            const strVal = customDef.formatValue ? customDef.formatValue(val) : String(val ?? '');
            onChange({ value: strVal });
            setOpen(false);
          }}
        />
      ) : (
        <ClausePopover
          clause={clause}
          anchor={pillRef.current}
          onClose={() => setOpen(false)}
          onChange={(patch) => {
            onChange(patch);
            setOpen(false);
          }}
        />
      ))}
    </div>
  );
}

export const MULTI_VALUE_TYPES: Record<string, true> = {
  tag: true,
  catalog: true,
  effort: true,
  discipline: true,
  intensity: true,
  origin: true,
  type: true,
  has: true,
};

const STATIC_OPTIONS: Record<string, { value: string; label: string }[]> = {
  source: SOURCE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  time: TIME_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  agg: AGG_OPTIONS,
  rollup: ROLLUP_OPTIONS,
  groupby: GROUPBY_OPTIONS,
  metric: METRIC_OPTIONS,
  unit: UNIT_OPTIONS,
  intensity: WQL_INTENSITY_TIERS.map((v) => ({ value: v, label: v })),
  origin: ['builtin', 'user', 'canonical', 'custom'].map((v) => ({ value: v, label: v })),
};

function emptyStateMessage({
  loading,
  itemCount,
  filter,
  binding,
  allSelected = false,
}: {
  loading: boolean;
  itemCount: number;
  filter: string;
  binding?: { open: boolean; emptyText: string };
  allSelected?: boolean;
}): string {
  if (loading) return 'Loading…';
  if (allSelected) return 'All options selected';
  if (itemCount === 0) return binding?.emptyText ?? 'Nothing here yet';
  if (!filter.trim()) return 'No options';
  const open = binding?.open ?? true;
  return open ? 'No matches — press Enter to use the typed value' : 'No matches — no such option';
}

/**
 * Popover surface rendered through a body portal at fixed coordinates
 * derived from the anchor element. CSS-`absolute` popovers get clipped by
 * any `overflow` ancestor (the inspector modal's scroll body), so the
 * composer's popovers escape to `document.body` instead. Flips above the
 * anchor when it would overflow the viewport bottom, and follows
 * scrolls/resizes so it stays glued to the trigger inside scroll dialogs.
 */
function FloatingPopover({
  anchor,
  className,
  testid,
  onKeyDown,
  innerRef,
  children,
}: {
  anchor: HTMLElement | null;
  className: string;
  testid: string;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  innerRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const update = () => {
      const el = measureRef.current;
      if (!el) return;
      const r = anchor.getBoundingClientRect();
      const gap = 6; // mt-1.5
      let top = r.bottom + gap;
      if (top + el.offsetHeight > window.innerHeight - 8) {
        top = Math.max(8, r.top - gap - el.offsetHeight); // flip above
      }
      let left = r.left;
      if (left + el.offsetWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - 8 - el.offsetWidth);
      }
      setPos((p) => (p && p.top === top && p.left === left ? p : { top, left }));
    };
    update();
    const scrollOpts = { capture: true, passive: true };
    window.addEventListener('scroll', update, scrollOpts);
    window.addEventListener('resize', update);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro && measureRef.current) ro.observe(measureRef.current);
    return () => {
      window.removeEventListener('scroll', update, scrollOpts);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [anchor]);

  if (!anchor) return null;
  return createPortal(
    <div
      ref={(el) => {
        measureRef.current = el;
        if (typeof innerRef === 'function') innerRef(el);
        else if (innerRef) innerRef.current = el;
      }}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={pos ? { position: 'fixed', top: pos.top, left: pos.left } : { position: 'fixed', visibility: 'hidden' }}
      className={className}
      data-testid={testid}
    >
      {children}
    </div>,
    document.body,
  );
}
export function ClausePopover({
  clause,
  anchor,
  onClose,
  onChange,
}: {
  clause: QueryClause;
  /** Trigger element the popover positions against (portal escapes overflow clipping). */
  anchor: HTMLElement | null;
  onClose: () => void;
  onChange: (patch: Partial<QueryClause>) => void;
}) {
  const meta = getClauseMeta(clause.type);
  const isMulti = MULTI_VALUE_TYPES[clause.type] === true;
  const selectedValues = isMulti
    ? clause.value.split('|').map((v) => v.trim()).filter(Boolean)
    : [];
  // Multi-select slots open with an empty combobox; the current selection
  // lives in the chip row, not in the input.
  const [val, setVal] = useState(isMulti ? '' : clause.value);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the filter input when present; otherwise the popover itself so
    // Up/Down + Enter keyboard selection works for target/scope/time slots.
    if (inputRef.current) inputRef.current.focus();
    else popoverRef.current?.focus();
  }, []);

  // Backdrop click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const { items: dynamicItems, loading, binding } = useSuggestions(clause.type);
  const staticItems = STATIC_OPTIONS[clause.type];

  // A suggestion binding wins when registered; otherwise static vocab.
  const items = binding
    ? dynamicItems.map((s) => ({ value: s.value, label: s.label ?? s.value }))
    : (staticItems ?? dynamicItems.map((s) => ({ value: s.value, label: s.label ?? s.value })));

  // Free-text filter input: hidden for closed static selects (Up/Down cycles
  // the full list), shown for metric/unit (typed values also accepted) and
  // freetext/suggestion slots so typed values filter or enter verbatim.
  const showFilterInput = !staticItems || clause.type === 'metric' || clause.type === 'unit';

  // Already-picked values leave the option list in multi-select mode.
  const availableItems = isMulti
    ? items.filter((item) => !selectedValues.includes(item.value))
    : items;

  const query = showFilterInput ? val : filter;
  const filteredItems = showFilterInput
    ? availableItems.filter((item) =>
        item.value.toLowerCase().includes(query.toLowerCase())
        || item.label.toLowerCase().includes(query.toLowerCase()))
    : availableItems;

  // Visible commit affordance for typed free text (#854).
  const typedValue = query.trim();
  const canCommitTyped =
    showFilterInput &&
    typedValue.length > 0 &&
    (binding?.open ?? true) &&
    !selectedValues.some((v) => v.toLowerCase() === typedValue.toLowerCase()) &&
    !filteredItems.some((item) => item.value.toLowerCase() === typedValue.toLowerCase());

  // Single-select slots hand the value up and the pill closes the popover;
  // multi-select slots append to the OR-list, clear the combobox, and stay
  // open for the next pick.
  const commitValue = (value: string) => {
    if (!isMulti) {
      onChange({ value });
      onClose();
      return;
    }
    if (selectedValues.includes(value)) return;
    onChange({ value: [...selectedValues, value].join('|') });
    setVal('');
    setFilter('');
    setHighlightIdx(0);
    inputRef.current?.focus();
  };

  const removeValue = (value: string) => {
    onChange({ value: selectedValues.filter((v) => v !== value).join('|') });
  };

  // Handled keys stop at the popover so an embedding container (the
  // palette's result list, issue #834) doesn't also navigate/select.
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightIdx((i) => Math.min(i + 1, Math.max(0, filteredItems.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredItems[highlightIdx]) {
        commitValue(filteredItems[highlightIdx].value);
      } else if (query.trim() && (binding?.open ?? true)) {
        // Open slots accept user-typed values not present in the list (#831).
        commitValue(query.trim());
      }
    } else if (e.key === 'Backspace' && isMulti && query === '' && selectedValues.length > 0) {
      // Standard combobox affordance: Backspace on an empty input pops the last chip.
      e.preventDefault();
      removeValue(selectedValues[selectedValues.length - 1]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <FloatingPopover
      anchor={anchor}
      innerRef={popoverRef}
      onKeyDown={handleKeyDown}
      className="w-64 p-2 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-[60] flex flex-col gap-1.5"
      testid={`clause-popover-${clause.type}`}
    >
      {showFilterInput ? (
        <input
          ref={inputRef}
          type="text"
          data-testid="wql-composer-input"
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            setHighlightIdx(0);
          }}
          placeholder={meta.placeholder ?? `Search ${clause.label}...`}
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
        />
      ) : (
        <input type="hidden" data-testid="wql-composer-input" value="" readOnly />
      )}
      {isMulti && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 py-1 border-b border-border/50">
          {selectedValues.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono"
            >
              {v}
              <button
                type="button"
                onClick={() => removeValue(v)}
                className="hover:text-destructive"
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
            onClick={() => commitValue(typedValue)}
            className="flex items-center justify-between px-2 py-1 text-xs text-left rounded hover:bg-muted/60 transition-colors font-mono"
            data-testid={`clause-commit-typed-${clause.type}`}
          >
            <span className="truncate">
              Search for <span className="font-semibold">&ldquo;{typedValue}&rdquo;</span>
            </span>
            <span className="text-muted-foreground/60 ml-1 shrink-0">↵</span>
          </button>
        )}
        {filteredItems.map((item, idx) => {
          const selected = selectedValues.includes(item.value)
            || (!isMulti && clause.value === item.value);
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => commitValue(item.value)}
              className={cn(
                'flex items-center justify-between px-2 py-1 text-xs text-left rounded hover:bg-muted/60 transition-colors font-mono',
                idx === highlightIdx ? 'bg-primary/15 font-semibold text-primary' : selected && 'bg-primary/10 text-primary font-medium',
              )}
            >
              <span className="truncate">{item.label || item.value}</span>
              {selected && <Check className="w-3 h-3 text-primary shrink-0" />}
            </button>
          );
        })}

        {filteredItems.length === 0 && !canCommitTyped && (
          <div className="text-[11px] text-muted-foreground text-center py-2 italic">
            {emptyStateMessage({
              loading,
              itemCount: availableItems.length,
              filter: query,
              binding,
              allSelected: isMulti && items.length > 0 && availableItems.length === 0,
            })}
          </div>
        )}
      </div>
    </FloatingPopover>
  );
}

export function CustomSlotPopover<TValue>({
  clause,
  anchor,
  definition,
  onClose,
  onChange,
}: {
  clause: QueryClause;
  /** Trigger element the popover positions against (portal escapes overflow clipping). */
  anchor: HTMLElement | null;
  definition: CustomSlotDefinition<TValue>;
  onClose: () => void;
  onChange: (value: TValue) => void;
}) {
  const Editor = definition.Editor;
  const initialValue = definition.parseValue && clause.value
    ? definition.parseValue(clause.value)
    : (clause.value as unknown as TValue);

  return (
    <FloatingPopover
      anchor={anchor}
      className="w-72 p-3 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-[60]"
      testid="custom-slot-popover"
    >
      <Editor value={initialValue} onChange={onChange} onClose={onClose} />
    </FloatingPopover>
  );
}

export function AddFilterDropdown({
  clauses,
  onAdd,
  allowedTypes,
  hiddenTypes,
}: {
  clauses: QueryClause[];
  onAdd: (clause: QueryClause) => void;
  allowedTypes?: ReadonlySet<string> | ClauseType[];
  hiddenTypes?: ReadonlySet<string>;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const customSlots = useComposerSlots();
  const existingTypes = new Set(clauses.map((c) => c.type));

  const sourceVal = clauses.find((c) => c.type === 'source')?.value || 'notes';
  const allowed = allowedTypes
    ? (allowedTypes instanceof Set ? allowedTypes : new Set(allowedTypes))
    : allowedFilterTypesForSource(sourceVal);

  const builtInAvailable = (Object.keys(CLAUSE_META) as ClauseType[]).filter(
    (type) =>
      !CLAUSE_META[type].required &&
      !existingTypes.has(type) &&
      (!hiddenTypes || !hiddenTypes.has(type)) &&
      allowed.has(type),
  );
  const customAvailable = customSlots.filter(
    (s) => !existingTypes.has(s.type) && (!hiddenTypes || !hiddenTypes.has(s.type)),
  );
  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        data-testid="add-filter-button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono text-muted-foreground border border-dashed border-border hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        <span>Filter</span>
      </button>
      {open && (
        <FloatingPopover
          anchor={triggerRef.current}
          className="w-48 p-1.5 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-[60] flex flex-col gap-0.5 max-h-56 overflow-y-auto"
          testid="add-filter-dropdown"
        >
          {builtInAvailable.map((type) => {
            const meta = CLAUSE_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAdd({ id: `${type}-${Date.now()}`, type, ...meta, value: '' });
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-muted font-mono"
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}

          {customAvailable.map((slot) => (
            <button
              key={slot.type}
              type="button"
              onClick={() => {
                onAdd({
                  id: `${slot.type}-${Date.now()}`,
                  type: slot.type,
                  label: slot.label,
                  icon: slot.icon,
                  placeholder: slot.placeholder,
                  value: '',
                });
                setOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-muted font-mono"
            >
              <span>{slot.icon}</span>
              <span>{slot.label}</span>
            </button>
          ))}
        </FloatingPopover>
      )}
    </div>
  );
}

export function AddCalcDropdown({
  clauses,
  onAdd,
}: {
  clauses: QueryClause[];
  onAdd: (clause: QueryClause) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sourceVal = clauses.find((c) => c.type === 'source')?.value || 'notes';
  if (sourcePlane(sourceVal) !== 'metrics') return null;

  const existingTypes = new Set(clauses.map((c) => c.type));

  const calcTypes: ClauseType[] = ['agg', 'metric', 'groupby', 'rollup', 'unit', 'where'];
  const available = calcTypes.filter((t) => !existingTypes.has(t));

  if (available.length === 0) return null;
  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono text-muted-foreground border border-dashed border-border hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Plus className="w-3 h-3" />
        <span>Add Calc</span>
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
      </button>

      {open && (
        <FloatingPopover
          anchor={triggerRef.current}
          className="w-44 p-1.5 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-[60] flex flex-col gap-0.5"
          testid="add-calc-dropdown"
        >
          {available.map((type) => {
            const meta = CLAUSE_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAdd({ id: `${type}-${Date.now()}`, type, ...meta, value: '' });
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-2 py-1 text-xs text-left rounded hover:bg-muted font-mono"
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </FloatingPopover>
      )}
    </div>
  );
}
