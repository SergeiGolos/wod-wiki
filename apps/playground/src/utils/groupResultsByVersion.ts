/**
 * groupResultsByVersion — pure function that splits a block's results into
 * "current" (matching the section's current contentId) and "history"
 * (all other contentIds, grouped by version).
 *
 * The current version is the max version whose results' blockContentId
 * matches section.contentId. If no results match, currentVersion is
 * `max(versions) + 1` (the version a new result WOULD get).
 *
 * Used by display layers to show current-version results inline and
 * previous-version results in a history toggle.
 */
import type { WorkoutResult } from '../types/storage';

export interface VersionGroup {
  version: number;
  contentId: string | undefined;
  results: WorkoutResult[];
}

export interface GroupedResults {
  /** Results matching the section's current contentId. */
  current: WorkoutResult[];
  /** Current version number (max version whose contentId matches). */
  currentVersion: number;
  /** All other versions, grouped by version number. */
  history: Map<number, VersionGroup>;
}

export function groupResultsByVersion(
  results: WorkoutResult[],
  blockId: string | undefined,
  currentContentId: string | undefined,
): GroupedResults {
  const blockResults = blockId ? results.filter(r => r.blockId === blockId) : results;
  if (blockResults.length === 0) {
    return { current: [], currentVersion: 0, history: new Map() };
  }

  // Group all results by version. segmentVersion (NoteSegment.version, written
  // by the current recorder path) wins; version (legacy computeVersion rows)
  // is the fallback for results recorded before the consolidation.
  const byVersion = new Map<number, WorkoutResult[]>();
  for (const r of blockResults) {
    const v = r.segmentVersion ?? r.version ?? 1;
    if (!byVersion.has(v)) byVersion.set(v, []);
    byVersion.get(v)!.push(r);
  }

  // Find the current version: the max version whose results' contentId
  // matches the section's current contentId.
  const currentEntries: WorkoutResult[] = [];
  let currentVersion = 0;
  for (const [version, rs] of byVersion) {
    if (rs.some(r => r.blockContentId === currentContentId)) {
      if (version > currentVersion) {
        currentVersion = version;
        currentEntries.length = 0;
        currentEntries.push(...rs);
      } else if (version === currentVersion) {
        currentEntries.push(...rs);
      }
    }
  }

  // Build history: everything not current
  const history = new Map<number, VersionGroup>();
  for (const [version, rs] of byVersion) {
    if (version !== currentVersion) {
      history.set(version, {
        version,
        contentId: rs[0]?.blockContentId,
        results: rs,
      });
    }
  }

  return { current: currentEntries, currentVersion, history };
}
