/**
 * resetUserData — wipes every durable data store the application owns, so the
 * "Reset & Clear Cache" menu action returns the app to a first-run state.
 *
 * Stores wiped, in order:
 *  1. IndexedDB `wodwiki-db` — the single durable store (notes, segments,
 *     results, attachments, analytics, efforts, page, tags, note_tags). The
 *     service closes its connection before issuing `deleteDatabase`, so the
 *     request is not blocked. The next page load reopens a fresh DB: the
 *     `IndexedDBService` constructor runs `openDB` at DB_VERSION 11 and the
 *     `upgrade` callback fires from version 0, recreating the full schema.
 *  2. localStorage — theme, audio, debug flag, onboarding flags, profile
 *     (wodwiki.profile.v1, wodwiki.profileInitialized.v1), and the V4
 *     migration flag (wodwiki:migrated-to-idb-v4).
 *  3. sessionStorage — the SPA redirect marker and any transient UI state.
 *
 * Each step is independent and best-effort: a failure in one store does not
 * skip the others. The caller reloads the page after this resolves so the
 * singleton services reinitialise against the now-empty state.
 */
import { indexedDBService } from '@/services/db/IndexedDBService';

export async function resetUserData(): Promise<void> {
  // 1. Primary store — close the live connection, then drop the whole DB.
  //    wipe() rejects on error/blocked; we swallow it here so a transient
  //    failure can't abort the secondary-store cleanup below. The reload that
  //    follows re-creates the DB either way.
  try {
    await indexedDBService.wipe();
  } catch {
    /* best-effort; secondary stores still cleared, reload re-inits */
  }

  // 2. localStorage.
  try {
    localStorage.clear();
  } catch {
    /* storage unavailable — nothing to clear */
  }

  // 3. sessionStorage.
  try {
    sessionStorage.clear();
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
