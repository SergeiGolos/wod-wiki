/**
 * useEffortsQueryState — nuqs-backed URL state for the Efforts page.
 *
 * Manages three URL parameters:
 *   `q`        — text search query (default: '')
 *   `origin`   — origin filter: 'all', 'bundled', 'user' (default: 'all')
 *   `discipline` — discipline filter (default: '')
 *
 * Both the EffortsPage (writer) and filter components (readers) share
 * this hook so the URL is always the source of truth.
 */

import { useQueryState } from 'nuqs';
import { useMemo, useCallback } from 'react';
import type { EffortRegistrySource } from '@/effort-registry';

export interface EffortsQueryState {
  text: string;
  origin: EffortRegistrySource | 'all';
  discipline: string;
}

export function useEffortsQueryState() {
  // ── Text search ───────────────────────────────────────────────────────
  const [text, setText] = useQueryState('q', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  // ── Origin filter ───────────────────────────────────────────────────
  const [originParam, setOriginParam] = useQueryState('origin', {
    defaultValue: 'all',
    shallow: true,
    history: 'replace',
  });

  const origin = useMemo(
    () => (originParam as any as EffortRegistrySource | 'all') || 'all',
    [originParam],
  );

  const setOrigin = useCallback(
    (newOrigin: EffortRegistrySource | 'all') => setOriginParam(newOrigin),
    [setOriginParam],
  );

  // ── Discipline filter ───────────────────────────────────────────────
  const [discipline, setDiscipline] = useQueryState('discipline', {
    defaultValue: '',
    shallow: true,
    history: 'replace',
  });

  return {
    text,
    setText,
    origin,
    setOrigin,
    discipline,
    setDiscipline,
  };
}
