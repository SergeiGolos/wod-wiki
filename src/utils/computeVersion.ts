/**
 * computeVersion — pure function that determines the version number for a new
 * WorkoutResult at a given block position.
 *
 * Version bumps when the content differs from the LATEST version's content.
 * Same content as latest → accumulate (same version). First result → version 1.
 *
 * Handles the cycle case (hashA → hashB → hashA) correctly: the check is
 * against the latest version only, not all historical versions.
 */
import type { WorkoutResult } from '../types/storage';

export function computeVersion(
  blockId: string,
  contentId: string | undefined,
  existingResults: WorkoutResult[],
): number {
  const blockResults = existingResults.filter(r => r.blockId === blockId);
  if (blockResults.length === 0) return 1;

  const maxVersion = Math.max(...blockResults.map(r => r.version ?? 1));
  const latestResults = blockResults.filter(r => (r.version ?? 1) === maxVersion);
  const contentChanged = !latestResults.some(r => r.blockContentId === contentId);

  return contentChanged ? maxVersion + 1 : maxVersion;
}
