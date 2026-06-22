/**
 * migratePlaygroundContent — one-time copy of note CONTENT from the legacy
 * `wodwiki-playground` database into the unified `wodwiki-db` notes/segments
 * stores (via `playgroundContent`).
 *
 * Runs before render (see main.tsx) and is gated by a localStorage flag, so it
 * executes exactly once and is a fast no-op thereafter. It reads the legacy DB
 * DIRECTLY (not via the deleted `playgroundDB` module) so that module can be
 * removed entirely. Failures do not set the flag, so a partial migration
 * retries on the next launch.
 */
import { openDB } from 'idb';
import { playgroundContent } from './playgroundContent';

const LEGACY_DB = 'wodwiki-playground';
const LEGACY_DB_VERSION = 2;
const FLAG = 'wodwiki:migrated-playground-content';

export async function migratePlaygroundContent(): Promise<void> {
  if (localStorage.getItem(FLAG)) return;

  let legacyPages: { id: string; category?: string; name?: string; content?: string; updatedAt?: number }[] = [];
  try {
    // Opening a non-existent DB at its version creates an empty shell; the
    // 'pages' store absence is treated as "nothing to migrate".
    const db = await openDB(LEGACY_DB, LEGACY_DB_VERSION);
    try {
      if (db.objectStoreNames.contains('pages')) {
        legacyPages = await db.getAll('pages');
      }
    } finally {
      db.close();
    }
  } catch {
    // Legacy DB unavailable — fresh install or blocked. Nothing to migrate.
    localStorage.setItem(FLAG, 'true');
    return;
  }

  try {
    for (const page of legacyPages) {
      if (!page.id || page.content === undefined) continue;
      await playgroundContent.savePage({
        id: page.id,
        category: page.category ?? page.id.slice(0, page.id.indexOf('/')),
        name: page.name ?? page.id,
        content: page.content,
        updatedAt: page.updatedAt ?? Date.now(),
      });
    }
    localStorage.setItem(FLAG, 'true');
    console.log(`[migratePlaygroundContent] migrated ${legacyPages.length} pages into wodwiki-db`);
  } catch (err) {
    // Leave the flag unset so the next launch retries.
    console.error('[migratePlaygroundContent] migration failed (will retry next launch)', err);
  }
}
