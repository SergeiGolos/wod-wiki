/**
 * useScriptBlockResults
 *
 * Fetches workout results associated with a specific WOD section.
 * Supports both IndexedDB (Production) and In-Memory (Storybook/Static) data sources.
 * Returns results sorted by completion date (most recent first).
 */

import { useState, useEffect } from 'react';
import type { WorkoutResult } from '@/types/storage';
import { useWorkbenchSession } from '@/stores/workbenchSessionStore'

export interface UseScriptBlockResultsReturn {
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
 * @param extendedResultsOverride - Optional explicit in-memory results (bypasses context)
 * @param contentId - Optional content-stable block id; when present, results are
 *                    matched on `blockContentId` first (survives line moves),
 *                    falling back to the line-based `sectionId` / `segmentId`.
 */
export function useScriptBlockResults(
  noteId: string | undefined,
  sectionId: string | undefined,
  extendedResultsOverride?: WorkoutResult[],
  contentId?: string,
): UseScriptBlockResultsReturn {
  const [results, setResults] = useState<WorkoutResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Read the in-memory `currentEntry` from the Workbench Session (Static
  // Mode populates this on mount; production backends hydrate via
  // `loadEntry` from the route's `noteId`).
  const currentEntry = useWorkbenchSession((s) => s.currentEntry);
  const getNote = useWorkbenchSession((s) => s.getNote);
  const extendedResults = extendedResultsOverride ?? currentEntry?.extendedResults;
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
          r => (contentId ? r.blockContentId === contentId : false)
            || r.sectionId === sectionId
            || r.segmentId === sectionId
        );
        
        console.log(`[useScriptBlockResults] Found ${inMemoryMatches.length} in-memory results for section: ${sectionId} (Total in currentEntry: ${extendedResults.length})`);
        
        if (inMemoryMatches.length > 0) {
          if (!cancelled) {
            setResults(inMemoryMatches.sort((a, b) => b.completedAt - a.completedAt));
            setLoading(false);
            return;
          }
        } else {
            console.log(`[useScriptBlockResults] No in-memory matches for section: ${sectionId}. Section IDs in extendedResults:`, extendedResults.map(r => r.sectionId));
        }
      }
      // 2. Fallback through the note persistence seam (History Mode).
      // The session exposes `getNote` as a proxy to the injected port;
      // skip if no port is wired (e.g. outside a provider).
      if (typeof getNote !== 'function') {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
        return;
      }

      try {
        const entry = await getNote(noteId!, {
          projection: 'history-detail',
          resultSelection: {
            mode: 'all-for-section',
            sectionId: sectionId!,
          },
        });
        const all: WorkoutResult[] = entry?.extendedResults ?? [];
        if (!cancelled) {
          // Sort by completedAt descending (most recent first)
          setResults(all.sort((a, b) => b.completedAt - a.completedAt));
        }
      } catch (err) {
        console.error('[useScriptBlockResults] Failed to fetch results:', err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchResults();

    return () => { cancelled = true; };
  }, [noteId, sectionId, extendedResults, getNote, contentId]);

  return { results, loading };
}
