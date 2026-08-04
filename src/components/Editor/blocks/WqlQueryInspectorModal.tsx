/**
 * WqlQueryInspectorModal — modal dialog embedding WqlComposer for editing
 * ```query and ```dashboard WQL block queries (#842, decision #837).
 */
import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import {
  WqlComposer,
  clausesToWql,
  wqlToClauses,
  defaultMetricsClauses,
  type QueryClause,
  type WqlExecutor,
} from '@/components/organisms/wql-composer';
import { queryService, isFindQuery } from '@/services/analytics/query';

export interface WqlQueryInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery: string;
  onApply: (newQuery: string) => void;
  title?: string;
  subtitle?: string;
}

export function WqlQueryInspectorModal({
  isOpen,
  onClose,
  initialQuery,
  onApply,
  title = 'Edit Block Query',
  subtitle = 'Use the Omni-Composer to edit this block query.',
}: WqlQueryInspectorModalProps) {
  const [clauses, setClauses] = useState<QueryClause[]>([]);
  const [isValid, setIsValid] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setClauses(wqlToClauses(initialQuery) ?? defaultMetricsClauses());
      setIsValid(true);
    }
  }, [isOpen, initialQuery]);

  const diagnosticsExecutor = useCallback<WqlExecutor>(
    (ast) => (isFindQuery(ast) ? queryService.runFind(ast) : queryService.runQuery(ast.raw)),
    [],
  );

  const handleApply = () => {
    if (!isValid) return;
    const compiled = clausesToWql(clauses);
    onApply(compiled);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      data-testid="query-inspector-modal"
    >
      <div className="nord-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-2xl space-y-4 border-border bg-card">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
            data-testid="close-query-inspector"
          >
            <X size={18} />
          </button>
        </div>

        <WqlComposer
          clauses={clauses}
          onClausesChange={setClauses}
          onValidationChange={(state) => setIsValid(state.valid)}
          execute={diagnosticsExecutor}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border text-muted-foreground hover:text-foreground"
            data-testid="cancel-query-inspector"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!isValid}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="apply-query-inspector"
          >
            Apply Query
          </button>
        </div>
      </div>
    </div>
  );
}
