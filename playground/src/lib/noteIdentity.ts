/**
 * noteIdentity (route half) — the single home for the kind→route rule.
 *
 * The composite-id parse (`parseNoteId` / `NoteRef`) is pure and shared with
 * the library — it lives in `src/lib/noteIdentity.ts`. What remains here is
 * routing: `noteRefToPath` needs the app's route table (`./routes`), which is
 * playground-level.
 */
import type { NoteRef } from '@/lib/noteIdentity';
import { journalEntryPath, playgroundPath, workoutPath } from './routes';

/**
 * Canonical back-route for a note — the single home for the kind→path rule,
 * replacing ad-hoc `noteId.split('/')` switches. Preserves the prior routing
 * exactly (including the bare-id → `/` fallback).
 *
 * NOTE: `'workout'` ids route via `/collections/:cat/:name`. That is likely
 * wrong for efforts (their detail is `/effort/:slug`) — pre-existing behavior,
 * intentionally unchanged here; fix separately with verification.
 */
export function noteRefToPath(ref: NoteRef): string {
  switch (ref.kind) {
    case 'journal':
      return journalEntryPath(ref.id);
    case 'playground':
      return playgroundPath(ref.id);
    case 'workout':
      return ref.category ? workoutPath(ref.category, ref.id) : '/';
  }
}
