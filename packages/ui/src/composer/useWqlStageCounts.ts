import { useEffect, useRef, useState } from 'react';
import { isFindQuery, type AnyParsedQuery } from '@bitcobblers/wod-wiki-wql';
import type { FindQueryResult, QueryResult } from '../contracts/query';

export type { AnyParsedQuery };

export type WqlExecutor = (ast: AnyParsedQuery) => Promise<FindQueryResult | QueryResult>;

export type WqlStageCounts =
  | { kind: 'find'; selected: number; matched: number }
  | { kind: 'aggregate'; selected: number; buckets: number; aggregated: number; groups: number };

export const DEFAULT_DIAGNOSTICS_DEBOUNCE_MS = 150;

export function useWqlStageCounts(
  ast: AnyParsedQuery,
  valid: boolean,
  execute: WqlExecutor | undefined,
  debounceMs: number = DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
): WqlStageCounts | undefined {
  const [stages, setStages] = useState<WqlStageCounts | undefined>(undefined);

  const executorRef = useRef(execute);
  executorRef.current = execute;

  const runnable = valid && !ast.error && execute !== undefined;

  useEffect(() => {
    if (!runnable) {
      setStages(undefined);
      return;
    }
    setStages(undefined);
    let cancelled = false;
    const timer = setTimeout(() => {
      executorRef.current?.(ast)
        .then((result) => {
          if (cancelled) return;
          setStages(
            isFindQuery(ast)
              ? { kind: 'find', ...(result as FindQueryResult).stages }
              : { kind: 'aggregate', ...(result as QueryResult).stages },
          );
        })
        .catch(() => {
          if (!cancelled) setStages(undefined);
        });
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ast, runnable, debounceMs]);

  return runnable ? stages : undefined;
}
