/**
 * Legacy ID compat: results were sometimes stored under a short-ID suffix of
 * the full note ID (or vice-versa). Match on either direction so historical
 * results are not orphaned. Shared by `IndexedDBNotePersistence` and
 * `IndexedDBService.getResultsForNote`.
 */
export function sameNoteId(resultNoteId: string, noteId: string): boolean {
  return (
    resultNoteId === noteId ||
    resultNoteId.endsWith(`-${noteId}`) ||
    noteId.endsWith(`-${resultNoteId}`)
  );
}
