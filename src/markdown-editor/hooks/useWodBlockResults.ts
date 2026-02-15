/**
 * useWodBlockResults
 *
 * Fetches workout results associated with a specific WOD section from IndexedDB.
 * Returns results sorted by completion date (most recent first).
 */

import { useState, useEffect } from 'react';
import type { WorkoutResult } from '@/types/storage';
import { indexedDBService } from '@/services/db/IndexedDBService';

export interface UseWodBlockResultsReturn {
  /** All results for this section, sorted most recent first */
  results: WorkoutResult[];
  /** Whether the initial load is in progress */
  loading: boolean;
}

/**
 * Fetch workout results for a specific WOD section.
 *
 * @param noteId   - The note containing the WOD block (short or full UUID)
 * @param sectionId - The WOD section ID within the note
 */
export function useWodBlockResults(
  noteId: string | undefined,
  sectionId: string | undefined,
): UseWodBlockResultsReturn {
  const [results, setResults] = useState<WorkoutResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noteId || !sectionId) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchResults() {
      try {
        const all = await indexedDBService.getResultsForSection(noteId!, sectionId!);
        if (!cancelled) {
          // Sort by completedAt descending (most recent first)
          setResults(all.sort((a, b) => b.completedAt - a.completedAt));
        }
      } catch (err) {
        console.error('[useWodBlockResults] Failed to fetch results:', err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchResults();

    return () => { cancelled = true; };
  }, [noteId, sectionId]);

  return { results, loading };
}
