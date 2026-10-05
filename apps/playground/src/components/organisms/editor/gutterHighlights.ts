import type { WhiteboardScript } from '@bitcobblers/wod-wiki-engine';

/**
 * Resolve stack-block sourceIds (Statement IDs) to content-relative source
 * lines via the runtime script. Statement ID is identity, not location — the
 * line comes from the statement itself (meta.line, 1-based within the fence
 * content). Parent and child statements sharing a source line collapse to a
 * single entry.
 */
export function sourceIdsToContentLines(
  script: Pick<WhiteboardScript, 'getId'> | null | undefined,
  sourceIds: readonly number[],
): number[] {
  const lines = new Set<number>();
  for (const id of sourceIds) {
    const stmt = script?.getId(id);
    const line = stmt?.meta?.line ?? stmt?.line;
    if (line !== undefined) lines.add(line);
  }
  return [...lines];
}
