/**
 * useEffortsQueryState — Efforts page URL state adapter.
 *
 * Bridges legacy text/origin/discipline query state to the WQL composer state
 * managed by `useEffortsComposerState`.
 */

import { useMemo, useCallback } from 'react';
import type { EffortRegistrySource } from '@/effort-registry';
import { CLAUSE_META } from '@/components/organisms/wql-composer';
import { useEffortsComposerState } from './useEffortsComposerState';

export interface EffortsQueryState {
  text: string;
  origin: EffortRegistrySource | 'all';
  discipline: string;
}

export function useEffortsQueryState() {
  const { clauses, setClauses } = useEffortsComposerState();

  const text = useMemo(() => {
    const c = clauses.find(c => c.type === 'text');
    return c?.value ?? '';
  }, [clauses]);

  const origin = useMemo(() => {
    const c = clauses.find(c => c.type === 'origin');
    return (c?.value as EffortRegistrySource | 'all') ?? 'all';
  }, [clauses]);

  const discipline = useMemo(() => {
    const c = clauses.find(c => c.type === 'discipline');
    return c?.value ?? '';
  }, [clauses]);

  const setText = useCallback(
    (newText: string) => {
      const next = clauses.filter(c => c.type !== 'text');
      const val = newText.trim();
      if (val) {
        next.push({ id: 'c-text-0', type: 'text', ...CLAUSE_META.text, value: val });
      }
      setClauses(next);
    },
    [clauses, setClauses],
  );

  const setOrigin = useCallback(
    (newOrigin: EffortRegistrySource | 'all') => {
      const next = clauses.filter(c => c.type !== 'origin');
      if (newOrigin !== 'all') {
        next.push({ id: 'c-origin-0', type: 'origin', ...CLAUSE_META.origin, value: newOrigin });
      }
      setClauses(next);
    },
    [clauses, setClauses],
  );

  const setDiscipline = useCallback(
    (newDiscipline: string) => {
      const next = clauses.filter(c => c.type !== 'discipline');
      const val = newDiscipline.trim();
      if (val) {
        next.push({ id: 'c-discipline-0', type: 'discipline', ...CLAUSE_META.discipline, value: val });
      }
      setClauses(next);
    },
    [clauses, setClauses],
  );

  return {
    text,
    setText,
    origin,
    setOrigin,
    discipline,
    setDiscipline,
  };
}
