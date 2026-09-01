import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { WqlComposer, type WqlExecutor } from '../composer';
import type { QueryResult } from '@bitcobblers/wod-wiki-wql';
import { isFindQuery } from '@bitcobblers/wod-wiki-wql';
import type { QueryExecutor } from '../contracts/query';

export interface WqlQueryInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery: string;
  onApply: (newQuery: string) => void;
  title?: string;
  subtitle?: string;
  /** Label for the confirm button (defaults to "Apply to Block"). */
  applyLabel?: string;
  executor?: QueryExecutor;
}

export function WqlQueryInspectorModal({
  isOpen,
  onClose,
  initialQuery,
  onApply,
  title = 'Edit Block Query',
  subtitle = 'Use the Omni-Composer to edit this block query.',
  applyLabel = 'Apply to Block',
  executor,
}: WqlQueryInspectorModalProps) {
  const [wql, setWql] = useState<string>(initialQuery);
  const [isValid, setIsValid] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) setWql(initialQuery);
  }, [isOpen, initialQuery]);

  const diagnosticsExecutor = useCallback<WqlExecutor>(
    (ast) => {
      if (executor) {
        return isFindQuery(ast) ? executor.runFind(ast) : executor.runQuery(ast.raw);
      }
      return Promise.resolve({
        parsed: ast,
        series: [],
        stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
        matched: [],
      } as unknown as QueryResult);
    },
    [executor],
  );

  const handleApply = () => {
    if (!isValid) return;
    onApply(wql);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wql-inspector-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/20">
          <div>
            <h2 id="wql-inspector-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <WqlComposer
            query={wql}
            onQueryChange={setWql}
            onValidationChange={(v) => setIsValid(v.valid)}
            execute={diagnosticsExecutor}
            showDiagnostics
          />
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-border/80 bg-muted/10">
          <div className="text-xs text-muted-foreground font-mono">
            {wql}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!isValid}
              className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition-colors"
            >
              {applyLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
