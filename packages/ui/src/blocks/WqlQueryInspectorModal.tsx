/**
 * WqlQueryInspectorModal — edit a ```query block's WQL through the shared
 * composer, hosted on the shared EditorDialog (sheet presentation on
 * mobile: no autofocus, footer outside the scroll body).
 *
 * The draft is controlled and its validity tracked synchronously alongside
 * every change; Apply re-validates the exact draft text at action time and
 * hands it to the host — the fence patcher upstream preserves the rest of
 * the note source. A rejected write keeps the dialog open with the draft
 * intact and the error visible; Cancel (or Escape) never writes.
 */
import { useCallback, useEffect, useState } from 'react';
import { EditorDialog } from '../dialog/EditorDialog';
import { WqlComposer, type WqlExecutor, type WqlValidationState } from '../composer';
import { isFindQuery, parseQuery } from '@bitcobblers/wod-wiki-wql';
import type { QueryExecutor } from '../contracts/query';

export interface WqlQueryInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery: string;
  /** Persist the applied query. A returned Promise gates the button until
   *  it settles; a rejection keeps the dialog open with the error visible. */
  onApply: (newQuery: string) => void | Promise<void>;
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
  const [validation, setValidation] = useState<WqlValidationState>({
    valid: !parseQuery(initialQuery).error,
  });
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWql(initialQuery);
      setValidation({ valid: !parseQuery(initialQuery).error });
      setError(null);
    }
  }, [isOpen, initialQuery]);

  const diagnosticsExecutor = useCallback<WqlExecutor>(
    (ast) => {
      if (!executor) throw new Error('No executor provided');
      return isFindQuery(ast) ? executor.runFind(ast) : executor.runQuery(ast.raw);
    },
    [executor],
  );

  const handleApply = async () => {
    // Validate the exact draft at action time; the composer's synchronous
    // state is not relied on within the same event.
    if (applying || parseQuery(wql).error) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(wql);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <EditorDialog
      open={isOpen}
      onClose={onClose}
      presentation="sheet"
      title={title}
      description={subtitle}
      footer={
        <>
          <div className="flex-1 min-w-0 truncate font-mono text-xs text-muted-foreground" data-testid="wql-inspector-draft">
            {wql}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="wql-inspector-apply"
            onClick={() => void handleApply()}
            disabled={!validation.valid || applying}
            className="min-h-12 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow transition-colors"
          >
            {applying ? 'Applying…' : applyLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <WqlComposer
          query={wql}
          onQueryChange={setWql}
          onValidationChange={setValidation}
          execute={executor ? diagnosticsExecutor : undefined}
          showDiagnostics
        />
        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono">
            {error}
          </p>
        )}
      </div>
    </EditorDialog>
  );
}
