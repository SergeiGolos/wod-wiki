import type { ViewUpdate } from '@codemirror/view';

export interface NoteBoundary {
  uuid: string;
  startLine: number; // 0-indexed
}

/**
 * Shifts note startLine boundaries in response to CodeMirror document changes.
 *
 * For each changed range in the transaction:
 * - Computes the difference in lines: newLines - oldLines.
 * - Any note boundary whose startLine was after the change (in pre-transaction line coordinates)
 *   is shifted by deltaLines.
 * - Bounds startLine to at least 0.
 */
export function shiftBoundariesOnUpdate(
  currentBoundaries: readonly NoteBoundary[],
  update: ViewUpdate
): NoteBoundary[] {
  if (!update.docChanged || currentBoundaries.length <= 1) {
    return [...currentBoundaries];
  }

  let boundaries = currentBoundaries.map((b) => ({ ...b }));

  update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    const fromLine = update.startState.doc.lineAt(fromA).number - 1; // 0-indexed
    const toLine = update.startState.doc.lineAt(toA).number - 1; // 0-indexed
    const oldLines = toLine - fromLine;
    const newLines = inserted.lines - 1;
    const deltaLines = newLines - oldLines;

    if (deltaLines === 0) return;

    boundaries = boundaries.map((boundary) => {
      // If the boundary starts after the edited region, shift it by deltaLines
      if (boundary.startLine > fromLine) {
        return {
          ...boundary,
          startLine: Math.max(0, boundary.startLine + deltaLines),
        };
      }
      return boundary;
    });
  });

  return boundaries;
}
