/**
 * Collection Workout — run → record → results E2E
 *
 * Flow under test (live app):
 *   1. /collections/:collection/:workout → click Play on the WOD block.
 *      This must CREATE A NEW RECORD: a journal note for today containing the
 *      cloned workout block, and the runtime auto-starts on the date page.
 *   2a. Stopping the workout early must persist a WorkoutResult against the
 *       created note and show the results review.
 *   2b. Letting a short workout complete naturally must persist a completed
 *       WorkoutResult and show the completion results view.
 *   3. After a reload, the note page displays the result inline on the block
 *      (results survive as first-class records, matched by content id).
 *
 * The two collection files are real; their content is overridden with short
 * E2E timers via IDB-first loading (usePlaygroundContent prefers stored
 * content over the bundled markdown). Dates are the real today — the run
 * profile's IndexedDB is ephemeral, and each test cleans up the journal note
 * it creates.
 */

import { test, expect, type Page } from '@playwright/test';
import { seedNote, getResults, WOD_DB } from '../helpers/wodwikiDb';
import { installFastClock } from '../utils/fastClock';
import { TEST_IDS } from '../contracts/TestIdContract';

// ── Fixtures ────────────────────────────────────────────────────────────────
const STOP_NOTE_ID = 'ZombieFit-org-2010-Jan/wod-011010';
const COMPLETE_NOTE_ID = 'ZombieFit-org-2010-Jan/wod-011310';
const STOP_TITLE = 'wod-011010';
const COMPLETE_TITLE = 'wod-011310';

const STOP_CONTENT = '# E2E Stop Run\n\n```time\n10:00 AMRAP\n  5 Air Squats\n  5 Push Ups\n```\n';
const COMPLETE_CONTENT = '# E2E Complete Run\n\n```time\n0:03 AMRAP\n  5 Air Squats\n```\n';

function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ── IDB helpers ─────────────────────────────────────────────────────────────

/** Find a note's uuid by title (journal notes created by the run flow). */
async function findNoteIdByTitle(page: Page, title: string): Promise<string | null> {
  return page.evaluate(async ({ dbName, title }) => {
    return new Promise<string | null>((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('notes', 'readonly');
        const getAll = tx.objectStore('notes').getAll();
        getAll.onsuccess = () => {
          const match = (getAll.result as Array<{ id: string; title?: string }>)
            .filter(n => n.title === title)
            .pop();
          db.close();
          resolve(match?.id ?? null);
        };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, { dbName: WOD_DB, title });
}


async function deleteNoteAndResults(page: Page, noteId: string | null): Promise<void> {
  if (!noteId) return;
  await page.evaluate(async ({ dbName, noteId }) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => {
        const db = req.result;
        const stores = ['notes', 'segments', 'note_tags', 'results']
          .filter(s => db.objectStoreNames.contains(s));
        const tx = db.transaction(stores, 'readwrite');
        tx.objectStore('notes').delete(noteId);
        for (const storeName of ['segments', 'note_tags', 'results']) {
          if (!stores.includes(storeName)) continue;
          const cursorReq = tx.objectStore(storeName).index('by-note').openCursor(IDBKeyRange.only(noteId));
          cursorReq.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) { cursor.delete(); cursor.continue(); }
          };
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, { dbName: WOD_DB, noteId });
}

/** Click the WOD block's Play command (DOM-click: overlay decorations can
 *  intercept pointer events, matching the wod-index spec pattern). */
async function clickPlayOnBlock(page: Page, blockText: string) {
  // Place the cursor inside the WOD block so its command bar renders.
  await page.locator('.cm-content').getByText(blockText).first().click();
  const play = page.locator('button[aria-label="Play"]').first();
  await expect(play).toBeVisible({ timeout: 10_000 });
  await play.evaluate((el) => (el as HTMLElement).click());
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe('Collection Workout — run and record', () => {
  // Fast clock (20×): the 0:03 AMRAP completes in ~150ms wall time; the
  // 10:00 AMRAP stop-early flow is unaffected (it never runs to completion).
  test.beforeEach(async ({ page }) => {
    await installFastClock(page);
  });

  test('creates a journal record on start; stopping early saves and displays results', async ({ page }, testInfo) => {
    const today = todayKey();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedNote(page, STOP_NOTE_ID, STOP_CONTENT, { title: 'E2E Stop Run' });
    await deleteNoteAndResults(page, await findNoteIdByTitle(page, STOP_TITLE));

    // 1. Start the workout from the collection page.
    await page.goto(`/collections/${STOP_NOTE_ID}`, { waitUntil: 'domcontentloaded' });
    // Collection detail defaults to read-mode markdown (#1008); runnable
    // blocks live behind the Edit toggle.
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });
    await clickPlayOnBlock(page, '10:00 AMRAP');

    // A new record (journal note for today) is created and the runtime opens.
    await page.waitForURL(new RegExp(`/journal/${today}`), { timeout: 15_000 });
    // Note-creation is verified through the DB below — the runtime overlay
    // covers the journal page here, and with the read-mode default (#1008)
    // there is no editor behind it to assert against.
    const noteUuid = await findNoteIdByTitle(page, STOP_TITLE);
    expect(noteUuid, 'Play must create a journal note for today').toBeTruthy();

    // Timer auto-starts the session clock; the workout waits at the
    // Ready-to-Start gate. Step through it (Next) to mount the first block —
    // the designed start gesture (see runtime-execution.e2e.ts).
    await expect(page.getByTestId(TEST_IDS.TIMER_STOP_SESSION)).toBeVisible({ timeout: 15_000 });
    await page.getByTestId(TEST_IDS.TIMER_NEXT_BLOCK).first().click();
    // Deliberate accumulation window: let the runtime produce some log
    // output before the early stop. At the 20× fast clock this 500ms of
    // wall time is ~10s of runtime.
    await page.waitForTimeout(500);

    // 2. Stop early → result persists against the created note.
    await page.getByTestId(TEST_IDS.TIMER_STOP_SESSION).click();

    await expect
      .poll(async () => (await getResults(page, noteUuid!)).length, { timeout: 10_000 })
      .toBe(1);
    const results = await getResults(page, noteUuid!);
    expect(results[0]?.data?.completed, 'manual stop records an incomplete result').toBe(false);

    // Results are displayed on the note page: the inline result panel renders
    // under the WOD block (a review overlay may also open when the run has
    // logs — close it so the note page is visible).
    const closeReview = page.getByTestId(TEST_IDS.FOCUSED_DIALOG_CLOSE).first();
    if (await closeReview.isVisible().catch(() => false)) {
      await closeReview.click();
    }
    // The journal page is in read-mode (#1008) and the inline result panel
    // is an editor preview — switch to Edit to verify it.
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(
      page.locator('.cm-query-block-preview, [data-testid="rows-table"]').first(),
      'result renders inline on the WOD block after stopping',
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath('collection-run-stop-review.png') });

    // 3. The inline result survives a hard reload (persisted record).
    await page.reload({ waitUntil: 'domcontentloaded' });
    // Read-mode default after reload: re-enter Edit for the source + preview.
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.locator('.cm-content')).toContainText(STOP_TITLE, { timeout: 15_000 });
    await expect(
      page.locator('.cm-query-block-preview, [data-testid="rows-table"]').first(),
      'persisted result renders inline on the WOD block',
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath('collection-run-stop-inline.png') });

    await deleteNoteAndResults(page, noteUuid);
  });

  test('completing a short workout saves a completed result and shows the results view', async ({ page }, testInfo) => {
    const today = todayKey();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedNote(page, COMPLETE_NOTE_ID, COMPLETE_CONTENT, { title: 'E2E Complete Run' });
    await deleteNoteAndResults(page, await findNoteIdByTitle(page, COMPLETE_TITLE));

    await page.goto(`/collections/${COMPLETE_NOTE_ID}`, { waitUntil: 'domcontentloaded' });
    // Read-mode default (#1008): enter Edit to expose runnable blocks.
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });
    await clickPlayOnBlock(page, '0:03 AMRAP');

    await page.waitForURL(new RegExp(`/journal/${today}`), { timeout: 15_000 });
    const noteUuid = await findNoteIdByTitle(page, COMPLETE_TITLE);
    expect(noteUuid, 'Play must create a journal note for today').toBeTruthy();

    // Step through the Ready-to-Start gate; the 3s AMRAP then completes
    // naturally → a results view opens (the timer's own completion view
    // and/or the page's review overlay).
    await expect(page.getByTestId(TEST_IDS.TIMER_STOP_SESSION)).toBeVisible({ timeout: 15_000 });
    await page.getByTestId(TEST_IDS.TIMER_NEXT_BLOCK).first().click();
    await expect(page.getByText(/Workout (Complete|Review)/).first()).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: testInfo.outputPath('collection-run-complete.png') });

    await expect
      .poll(async () => (await getResults(page, noteUuid!)).length, { timeout: 10_000 })
      .toBe(1);
    const results = await getResults(page, noteUuid!);
    expect(results[0]?.data?.completed, 'natural finish records a completed result').toBe(true);

    await deleteNoteAndResults(page, noteUuid);
  });
});
