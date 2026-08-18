import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Command } from 'lucide-react';
import { cn } from '../utils/cn';
import { TokenSlotPill, AddFilterDropdown, AddCalcDropdown } from './QueryPalette';
import { diagnoseClauses } from './diagnostics';
import { WqlDiagnosticsStrip } from './WqlDiagnosticsStrip';
import {
  useWqlStageCounts,
  DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  type WqlExecutor,
  type AnyParsedQuery,
} from './useWqlStageCounts';
import {
  type QueryClause,
  getClauseMeta,
  clauseValue,
  sourcePlane,
  defaultClauses,
  pivotClauses,
  clausesToWql,
} from './queryClauses';

export interface WqlValidationState {
  valid: boolean;
  error?: string;
  wql: string;
  ast: AnyParsedQuery;
}

export interface WqlComposerProps {
  initialClauses?: QueryClause[];
  clauses?: QueryClause[];
  onClausesChange?: (clauses: QueryClause[]) => void;
  onWqlChange?: (wql: string) => void;
  onValidationChange?: (state: WqlValidationState) => void;
  onAstChange?: (ast: AnyParsedQuery) => void;
  onSubmit?: (wql: string, ast: AnyParsedQuery) => void;
  showDiagnostics?: boolean;
  execute?: WqlExecutor;
  debounceMs?: number;
  customSlots?: import('./ComposerRegistry').CustomSlotDefinition<any>[];
  diagnosticsActions?: ReactNode;
  hiddenClauseTypes?: string[];
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

export function WqlComposer({
  initialClauses,
  clauses: controlledClauses,
  onClausesChange,
  onWqlChange,
  onValidationChange,
  onAstChange,
  onSubmit: _onSubmit,
  showDiagnostics = true,
  execute,
  debounceMs = DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  customSlots: _customSlots,
  diagnosticsActions,
  hiddenClauseTypes,
  autoFocus: _autoFocus = false,
  placeholder: _placeholder = 'Type search term and press Enter...',
  className,
}: WqlComposerProps) {
  const [internalClauses, setInternalClauses] = useState<QueryClause[]>(
    () => initialClauses || defaultClauses(),
  );

  const clauses = controlledClauses ?? internalClauses;

  const updateClauses = useCallback(
    (next: QueryClause[] | ((prev: QueryClause[]) => QueryClause[])) => {
      const resolved = typeof next === 'function' ? next(clauses) : next;
      if (controlledClauses === undefined) {
        setInternalClauses(resolved);
      }
      onClausesChange?.(resolved);
    },
    [clauses, controlledClauses, onClausesChange],
  );

  const wql = useMemo(() => clausesToWql(clauses), [clauses]);
  const diagnostics = useMemo(() => diagnoseClauses(clauses), [clauses]);

  const lastWqlRef = useRef<string | null>(null);
  const lastValidRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (lastWqlRef.current !== wql || lastValidRef.current !== diagnostics.valid) {
      lastWqlRef.current = wql;
      lastValidRef.current = diagnostics.valid;
      onWqlChange?.(wql);
      onValidationChange?.({
        valid: diagnostics.valid,
        error: diagnostics.error,
        wql,
        ast: diagnostics.ast,
      });
      onAstChange?.(diagnostics.ast);
    }
  }, [wql, diagnostics.valid, diagnostics.error, diagnostics.ast, onWqlChange, onValidationChange, onAstChange]);

  const stages = useWqlStageCounts(diagnostics.ast, diagnostics.valid, execute, debounceMs);

  const handlePillChange = (id: string, patch: Partial<QueryClause>) => {
    updateClauses((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...patch };
        if (c.type === 'source' && patch.value !== undefined) {
          return pivotClauses(prev, patch.value).find((x) => x.type === 'source') || updated;
        }
        return updated;
      }),
    );
  };

  const handlePillRemove = (id: string) => {
    updateClauses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddClause = (clause: QueryClause) => {
    updateClauses((prev) => [...prev, clause]);
  };

  const plane = sourcePlane(clauseValue(clauses, 'source', 'journal'));
  const visibleClauses = useMemo(() => {
    if (!hiddenClauseTypes) return clauses;
    const hidden = new Set(hiddenClauseTypes);
    return clauses.filter((c) => !hidden.has(c.type));
  }, [clauses, hiddenClauseTypes]);

  return (
    <div
      data-testid="wql-composer"
      className={cn('flex flex-col gap-2 p-3 rounded-xl border border-border bg-card shadow-sm', className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="p-1 rounded bg-muted/60 text-muted-foreground">
          <Command className="w-3.5 h-3.5" />
        </div>

        {visibleClauses.map((clause) => (
          <TokenSlotPill
            key={clause.id}
            clause={clause}
            invalid={diagnostics.offendingClauseId === clause.id}
            invalidReason={diagnostics.error}
            onChange={(patch) => handlePillChange(clause.id, patch)}
            onRemove={() => handlePillRemove(clause.id)}
          />
        ))}

        <AddFilterDropdown clauses={clauses} onAdd={handleAddClause} />
        {plane === 'metrics' && <AddCalcDropdown clauses={clauses} onAdd={handleAddClause} />}
      </div>

      {showDiagnostics && (
        <WqlDiagnosticsStrip
          diagnostics={diagnostics}
          offendingLabel={
            diagnostics.offendingClauseId
              ? getClauseMeta(clauses.find((c) => c.id === diagnostics.offendingClauseId)?.type ?? '').label
              : undefined
          }
          stages={stages}
          actions={diagnosticsActions}
        />
      )}
    </div>
  );
}
