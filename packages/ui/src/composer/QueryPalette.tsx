/**
 * QueryPalette — token pills for the composer's clause row.
 *
 * Pills are real buttons in the native tab order (no virtual navigation);
 * removal is a sibling labelled button rather than an interactive control
 * nested inside another button. Editors — built-in option lists
 * (InlineClauseEditor) and custom slot editors — render in the composer's
 * owned picker region under the box; the pill never opens a surface itself
 * and nothing here portals to the body.
 */
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import type { QueryClause } from './queryClauses';
import { CLEAR_ONLY_TYPES, getClauseMeta } from './queryClauses';

export interface TokenSlotPillProps {
  clause: QueryClause;
  isActive?: boolean;
  invalid?: boolean;
  invalidReason?: string;
  onClick?: () => void;
  onRemove?: () => void;
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
  compact = false,
  placeholderOverride,
}: TokenSlotPillProps) {
  const meta = getClauseMeta(clause.type);
  const hasValue = Boolean(clause.value && clause.value.trim());
  const removeLabel = CLEAR_ONLY_TYPES[clause.type] ? `Clear ${meta.label}` : `Remove ${meta.label}`;

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        data-testid={`token-slot-${clause.type}`}
        onClick={onClick}
        aria-pressed={isActive || undefined}
        title={invalid ? invalidReason : undefined}
        className={cn(
          'inline-flex items-center gap-1 rounded-full text-xs font-mono transition-colors cursor-pointer select-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          // Whole pill is a touch target too: 44px minimum at every width.
          'min-h-11 min-w-11',
          invalid
            ? 'bg-destructive/10 text-destructive border-destructive/40 hover:bg-destructive/20'
            : isActive
              ? 'bg-primary text-primary-foreground border-primary font-medium shadow-sm'
              : hasValue
                ? 'bg-muted/80 text-foreground border-border hover:bg-muted'
                : 'bg-muted/40 text-muted-foreground border-dashed border-border hover:bg-muted/60',
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1',
        )}
      >
        <span className="text-[10px] opacity-70">{meta.icon}</span>
        {/* Label prefix only while the pill is engaged — at rest the value
            alone reads cleaner than the "<label>: value" prefix. */}
        {isActive && (
          <span className="font-semibold text-[11px] opacity-90">{meta.label}:</span>
        )}
        <span data-testid={`token-slot-value-${clause.type}`} className={cn('truncate max-w-44', !hasValue && 'italic opacity-60')}>
          {hasValue ? clause.value : placeholderOverride || meta.placeholder}
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          data-testid={`token-slot-remove-${clause.type}`}
          onClick={onRemove}
          aria-label={removeLabel}
          title={removeLabel}
          className={cn(
            'inline-flex items-center justify-center -ml-0.5 p-1 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            invalid
              ? 'text-destructive/70 hover:text-destructive'
              : 'text-inherit opacity-70 hover:opacity-100 hover:bg-black/10',
            // Labelled removal is a real control: 44px hit target everywhere.
            'min-h-11 min-w-11',
          )}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
