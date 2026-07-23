import type { Page } from '@playwright/test';

/**
 * wodwikiDb — raw IndexedDB helpers for e2e tests against `wodwiki-db`.
 *
 * The app opened the DB at V11 long before the test page loads, so
 * `indexedDB.open(name)` (no version) attaches to the live schema without
 * firing `onupgradeneeded`. Every helper opens its own short-lived connection
 * and closes it in a `finally` to avoid blocking the app's singleton.
 *
 * Seeding uses a single `markdown` segment whose `rawContent` is the full
 * document. `IndexedDBContentProvider.getEntry` reconstructs content by
 * mapping segments and joining with `\n`; a lone markdown segment round-trips
 * verbatim, so pre-seeded editor content matches what the test wrote.
 */

export const WOD_DB = 'wodwiki-db';

/** Seed a Note + single markdown segment so the app loads `content` verbatim. */
export async function seedNote(
  page: Page,
  noteId: string,
  content: string,
  opts?: { type?: string; title?: string },
): Promise<void> {
  await page.evaluate(
    async ({ dbName, noteId, content, type, title }) => {
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        const now = Date.now();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(['notes', 'segments'], 'readwrite');
          tx.objectStore('notes').put({
            id: noteId,
            title: title ?? noteId.split('/').pop() ?? noteId,
            type: type ?? 'note',
            createdAt: now,
          });
          tx.objectStore('segments').put({
            id: 'seg-0',
            version: 1,
            noteId,
            position: 0,
            dataType: 'markdown',
            data: null,
            rawContent: content,
            createdAt: now,
            updatedAt: now,
            isHistory: false,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { dbName: WOD_DB, noteId, content, type: opts?.type, title: opts?.title },
  );
}

/**
 * Delete a Note (and its segments + note_tags) by route id. Tries `id` first,
 * then the `by-slug` index, mirroring `IndexedDBContentProvider.getEntry`.
 */
export async function deleteNoteByRouteId(page: Page, routeId: string): Promise<void> {
  await page.evaluate(
    async ({ dbName, routeId }) => {
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(['notes', 'segments', 'note_tags'], 'readwrite');
          const notesStore = tx.objectStore('notes');

          const deleteCascade = (noteId: string) => {
            notesStore.delete(noteId);
            const segCursor = tx.objectStore('segments').index('by-note').openCursor(
              IDBKeyRange.only(noteId),
            );
            segCursor.onsuccess = (e) => {
              const c = (e.target as IDBRequest<IDBCursorWithValue>).result;
              if (c) { c.delete(); c.continue(); }
            };
            const tagCursor = tx.objectStore('note_tags').index('by-note').openCursor(
              IDBKeyRange.only(noteId),
            );
            tagCursor.onsuccess = (e) => {
              const c = (e.target as IDBRequest<IDBCursorWithValue>).result;
              if (c) { c.delete(); c.continue(); }
            };
          };

          const idReq = notesStore.get(routeId);
          idReq.onsuccess = () => {
            if (idReq.result) {
              deleteCascade(idReq.result.id);
            } else {
              const slugReq = notesStore.index('by-slug').get(routeId);
              slugReq.onsuccess = () => {
                if (slugReq.result) deleteCascade(slugReq.result.id);
              };
            }
          };

          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { dbName: WOD_DB, routeId },
  );
}

/** Clear every Note, Segment, and NoteTag row — full content reset for tests. */
export async function clearAllNotes(page: Page): Promise<void> {
  await page.evaluate(async ({ dbName }) => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['notes', 'segments', 'note_tags'], 'readwrite');
        tx.objectStore('notes').clear();
        tx.objectStore('segments').clear();
        tx.objectStore('note_tags').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, { dbName: WOD_DB });
}

/**
 * Read a note's reconstructed content by route id. Mirrors
 * `IndexedDBContentProvider.getEntry` reconstruction: latest (non-history)
 * segments sorted by position, wod segments wrapped in fences.
 */
/**
 * Seed a journal-date note that the /journal/:date page renders.
 *
 * V10/V11 schema: a HistoryEntry's `journalDate` is DERIVED from the `page`
 * store via `note.pageId` (the note row no longer stores it), and the date
 * page lists via `journalNotes.listByDate` → `listNotes({ journalDate, kind:
 * 'journal' })`. So a journal seed needs all three rows:
 *   page     — the calendar page (`date` is the join key)
 *   notes    — `type: 'journal'` + `pageId` → page
 *   segments — the markdown content the editor loads
 *
 * Ids are deterministic (`journal/<date>`, `page/<date>`) so the existing
 * route-id helpers (`clearStoredEntry` / `storedContent` in JournalEntryPage)
 * resolve the same note.
 */
export async function seedJournalNote(
  page: Page,
  date: string,
  content: string,
  opts?: { title?: string },
): Promise<void> {
  await page.evaluate(
    async ({ dbName, date, content, title }) => {
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        const now = Date.now();
        const pageId = `page/${date}`;
        const noteId = `journal/${date}`;
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(['page', 'notes', 'segments'], 'readwrite');
          tx.objectStore('page').put({ id: pageId, date, title: date, createdAt: now });
          tx.objectStore('notes').put({
            id: noteId,
            title: title ?? date,
            type: 'journal',
            pageId,
            createdAt: now,
          });
          tx.objectStore('segments').put({
            id: `seg-${noteId}-0`,
            version: 1,
            noteId,
            pageId,
            position: 0,
            dataType: 'markdown',
            data: null,
            rawContent: content,
            createdAt: now,
            updatedAt: now,
            isHistory: false,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { dbName: WOD_DB, date, content, title: opts?.title },
  );
}

export async function getNoteContentByRouteId(
  page: Page,
  routeId: string,
): Promise<string | null> {
  return page.evaluate(
    async ({ dbName, routeId }): Promise<string | null> => {
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        return await new Promise<string | null>((resolve, reject) => {
          const tx = db.transaction(['notes', 'segments'], 'readonly');
          const notesStore = tx.objectStore('notes');

          const readSegments = (noteId: string) => {
            const segIdx = tx.objectStore('segments').index('by-note');
            const segReq = segIdx.getAll(IDBKeyRange.only(noteId));
            segReq.onsuccess = () => {
              const all = segReq.result as Array<{
                id: string; version: number; dataType: string;
                data: { dialect?: string } | null;
                rawContent: string; position?: number; isHistory?: boolean;
              }>;
              // Latest version per segment id.
              const latest = new Map<string, typeof all[number]>();
              for (const seg of all) {
                const cur = latest.get(seg.id);
                if (!cur || seg.version > cur.version) latest.set(seg.id, seg);
              }
              const ordered = [...latest.values()]
                .filter((s) => !s.isHistory)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
              const raw = ordered
                .map((s) => {
                  const isWod = s.dataType === 'wod' || s.dataType === 'script';
                  if (isWod) {
                    const dialect = s.data?.dialect ?? 'wod';
                    return '```' + dialect + '\n' + s.rawContent + '\n```';
                  }
                  return s.rawContent;
                })
                .join('\n');
              resolve(raw || null);
            };
            segReq.onerror = () => reject(segReq.error);
          };

          const idReq = notesStore.get(routeId);
          idReq.onsuccess = () => {
            if (idReq.result) {
              readSegments(idReq.result.id);
            } else {
              const slugReq = notesStore.index('by-slug').get(routeId);
              slugReq.onsuccess = () => {
                if (slugReq.result) readSegments(slugReq.result.id);
                else resolve(null);
              };
              slugReq.onerror = () => reject(slugReq.error);
            }
          };
          idReq.onerror = () => reject(idReq.error);
        });
      } finally {
        db.close();
      }
    },
    { dbName: WOD_DB, routeId },
  );
}
