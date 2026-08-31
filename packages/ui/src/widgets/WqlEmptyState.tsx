import { ReactNode, useMemo } from 'react';
import type { QueryResult } from '@bitcobblers/wod-wiki-wql';

export interface WqlEmptyStateProps {
  result?: QueryResult | undefined;
  className?: string;
  actions?: ReactNode;
}

export function WqlEmptyState({ result, className, actions }: WqlEmptyStateProps) {
  const message = useMemo(() => {
    if (!result) return 'Loading…';
    if (result.parsed.error) return `Query error: ${result.parsed.error}`;
    if (result.series.length === 0) return 'No data for this range.';
    return null;
  }, [result]);

  if (message === null && !actions) return null;

  return (
    <div className={`h-full flex flex-col items-center justify-center text-sm text-muted-foreground px-4 text-center ${className ?? ''}`}>
      {message && <div>{message}</div>}
      {actions && <div className="mt-3">{actions}</div>}
    </div>
  );
}
