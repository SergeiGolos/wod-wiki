/**
 * useWodBlockResults
 *
 * Fetches workout results associated with a specific WOD section.
 * Supports both IndexedDB (Production) and In-Memory (Storybook/Static) data sources.
 * Returns results sorted by completion date (most recent first).
 */

import { useState, useEffect } from 'react';
import type { WorkoutResult } from '@/types/storage';
import { indexedDBService } from '@/services/db/IndexedDBService';
import { useWorkbench } from '@/components/layout/WorkbenchContext';

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

  // Attempt to consume WorkbenchContext for in-memory results (Static Mode)
  let workbench;
  try {
    workbench = useWorkbench();
  } catch {
    // Silent fail if outside provider
  }

  const extendedResults = workbench?.currentEntry?.extendedResults;

  useEffect(() => {
    if (!noteId || !sectionId) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchResults() {
      // 1. Check for in-memory results (Static Mode or immediate UI update)
      // Use extendedResults array if available (Mutable Static mode)
      if (Array.isArray(extendedResults)) {
        const inMemoryMatches = extendedResults.filter(
          r => r.sectionId === sectionId || r.segmentId === sectionId
        );
        
        if (inMemoryMatches.length > 0) {
          if (!cancelled) {
            setResults(inMemoryMatches.sort((a, b) => b.completedAt - a.completedAt));
            setLoading(false);
            return;
          }
        }
      }

      // 2. Fallback to IndexedDB (History Mode)
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
  }, [noteId, sectionId, extendedResults]);

  return { results, loading };
}
