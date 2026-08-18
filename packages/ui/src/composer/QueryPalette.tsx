import { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Plus, X, ChevronDown, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { composerRegistry, useComposerSlots, type CustomSlotDefinition } from './ComposerRegistry';
import { useSuggestions } from './useSuggestions';
import {
  type QueryClause,
  type ClauseType,
  CLAUSE_META,
  getClauseMeta,
  SOURCE_OPTIONS,
  TIME_OPTIONS,
  AGG_OPTIONS,
  ROLLUP_OPTIONS,
  GROUPBY_OPTIONS,
  METRIC_OPTIONS,
  UNIT_OPTIONS,
} from './queryClauses';
import { WQL_INTENSITY_TIERS } from '@wod-wiki/engine';

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
        <span className={cn('truncate max-w-44', !hasValue && 'italic opacity-60')}>
          {hasValue ? clause.value : placeholderOverride || meta.placeholder}
        </span>
        {onRemove && !meta.required && (
          <button
            type="button"
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

export function ClausePopover({
  clause,
  onClose,
  onChange,
}: {
  clause: QueryClause;
  onClose: () => void;
  onChange: (patch: Partial<QueryClause>) => void;
}) {
  const [filter, setFilter] = useState('');
  const { items: dynamicItems, loading, binding } = useSuggestions(clause.type);
  const staticItems = STATIC_OPTIONS[clause.type];
  const items = staticItems || dynamicItems;
  const isMulti = MULTI_VALUE_TYPES[clause.type] === true;

  const currentValues = isMulti
    ? clause.value.split('|').map((v) => v.trim()).filter(Boolean)
    : [clause.value.trim()].filter(Boolean);

  const filteredItems = items.filter((i) =>
    i.label?.toLowerCase().includes(filter.toLowerCase()) ||
    i.value.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleSelect = (val: string) => {
    if (isMulti) {
      const next = currentValues.includes(val)
        ? currentValues.filter((v) => v !== val)
        : [...currentValues, val];
      onChange({ value: next.join('|') });
    } else {
      onChange({ value: val });
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems.length > 0) {
        handleSelect(filteredItems[0].value);
      } else if (filter.trim()) {
        handleSelect(filter.trim());
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="absolute left-0 top-full mt-1.5 w-64 p-2 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50 flex flex-col gap-1.5"
      data-testid="clause-popover"
    >
      <input
        type="text"
        autoFocus
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Search ${clause.label}...`}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
      />

      {isMulti && currentValues.length > 0 && (
        <div className="flex flex-wrap gap-1 py-1 border-b border-border/50">
          {currentValues.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono"
            >
              {v}
              <button
                type="button"
                onClick={() => handleSelect(v)}
                className="hover:text-destructive"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="max-h-44 overflow-y-auto flex flex-col gap-0.5">
        {filteredItems.map((item) => {
          const selected = currentValues.includes(item.value);
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => handleSelect(item.value)}
              className={cn(
                'flex items-center justify-between px-2 py-1 text-xs text-left rounded hover:bg-muted/60 transition-colors font-mono',
                selected && 'bg-primary/10 text-primary font-medium',
              )}
            >
              <span className="truncate">{item.label || item.value}</span>
              {selected && <Check className="w-3 h-3 text-primary shrink-0" />}
            </button>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-2 italic">
            {emptyStateMessage({
              loading,
              itemCount: items.length,
              filter,
              binding,
              allSelected: isMulti && items.length > 0 && items.every((i) => currentValues.includes(i.value)),
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomSlotPopover<TValue>({
  clause,
  definition,
  onClose,
  onChange,
}: {
  clause: QueryClause;
  definition: CustomSlotDefinition<TValue>;
  onClose: () => void;
  onChange: (value: TValue) => void;
}) {
  const Editor = definition.Editor;
  const initialValue = definition.parseValue && clause.value
    ? definition.parseValue(clause.value)
    : (clause.value as unknown as TValue);

  return (
    <div
      className="absolute left-0 top-full mt-1.5 w-72 p-3 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50"
      data-testid="custom-slot-popover"
    >
      <Editor value={initialValue} onChange={onChange} onClose={onClose} />
    </div>
  );
}

export function AddFilterDropdown({
  clauses,
  onAdd,
}: {
  clauses: QueryClause[];
  onAdd: (clause: QueryClause) => void;
}) {
  const [open, setOpen] = useState(false);
  const customSlots = useComposerSlots();
  const existingTypes = new Set(clauses.map((c) => c.type));

  const builtInAvailable = (Object.keys(CLAUSE_META) as ClauseType[]).filter(
    (type) => !CLAUSE_META[type].required && !existingTypes.has(type),
  );
  const customAvailable = customSlots.filter((s) => !existingTypes.has(s.type));

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono text-muted-foreground border border-dashed border-border hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Plus className="w-3 h-3" />
        <span>Add Filter</span>
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 w-48 p-1.5 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50 flex flex-col gap-0.5 max-h-56 overflow-y-auto"
          data-testid="add-filter-dropdown"
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
        </div>
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
  const existingTypes = new Set(clauses.map((c) => c.type));

  const calcTypes: ClauseType[] = ['agg', 'metric', 'groupby', 'rollup', 'unit', 'where'];
  const available = calcTypes.filter((t) => !existingTypes.has(t));

  if (available.length === 0) return null;

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono text-muted-foreground border border-dashed border-border hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Plus className="w-3 h-3" />
        <span>Add Calc</span>
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 w-44 p-1.5 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50 flex flex-col gap-0.5"
          data-testid="add-calc-dropdown"
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
        </div>
      )}
    </div>
  );
}
