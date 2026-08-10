/**
 * noteIdentity (parse half) — a typed view over the composite noteId string.
 *
 * The noteId is a `${category}/${name}` composite overloaded as a storage key,
 * the results join key, AND a routing discriminator. `parseNoteId` gives it a
 * typed `NoteRef` so consumers stop `noteId.split('/')`-ing ad-hoc. It is pure
 * string parsing with no routing knowledge, so it lives in the library
 * (`src/lib/`) — the kind→route rule (`noteRefToPath`) needs the app's route
 * table and stays in `playground/src/lib/noteIdentity.ts`.
 *
 * ADDITIVE: it never rewrites stored ids — `raw` carries the original string
 * for use as a storage key, so no result is ever orphaned by a format change.
 */

/** Which note family a noteId belongs to. */
export type NoteKind = 'journal' | 'playground' | 'workout';

/**
 * A typed, routable reference to a note. `raw` is the authoritative storage
 * key; the other fields are a typed projection of it.
 */
export interface NoteRef {
  /** The note family. `'workout'` is the catch-all for collection / effort / feed ids. */
  kind: NoteKind;
  /** Id within the family: date key (journal), name (playground), or workout name (workout). */
  id: string;
  /** Only for `'workout'`: the category segment (collection slug / `'effort'` / `'feed'`). */
  category?: string;
  /** The original composite noteId string — use as the storage key, never reconstruct it. */
  raw: string;
}

/**
 * Parse a composite noteId into a typed `NoteRef`. Preserves the original
 * string as `raw` so storage keys are never lost.
 */
export function parseNoteId(noteId: string): NoteRef {
  const segs = noteId.split('/');
  const head = segs[0] ?? noteId;
  const name = segs[1] ?? '';
  if (head === 'journal') return { kind: 'journal', id: name, raw: noteId };
  if (head === 'playground') return { kind: 'playground', id: name, raw: noteId };
  if (segs.length < 2) return { kind: 'workout', id: head, raw: noteId };
  return { kind: 'workout', category: head, id: name, raw: noteId };
}
