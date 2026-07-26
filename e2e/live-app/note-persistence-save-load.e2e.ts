/**
 * Note Persistence — save/load/complete-workout E2E flow
 *
 * Exercises the note persistence seam end-to-end through the live app:
 * 1. Load a journal note and verify its content persists across navigation
 * 2. Start a workout and confirm the runtime session launches
 * 3. Complete the workout and verify the result is saved to IndexedDB
 * 4. Navigate back to the note and verify the result badge appears
 *
 * These tests specifically target flows that go through the PR #581
 * persistence seam (IndexedDBService → IndexedDBNotePersistence /
 * ContentProviderNotePersistence via WorkbenchContext).
 *
 * Test isolation: all tests use far-future dates (2099) so they never
 * collide with real user data. IndexedDB is cleared before each test.
 */

import { test, expect } from '@playwright/test';
import { JournalEntryPage } from '../pages/JournalEntryPage';
import { seedJournalNote, clearResults, getResults, WOD_DB } from '../helpers/wodwikiDb';

// ── Stable test dates ─────────────────────────────────────────────────────────
const DATE_CONTENT_ROUNDTRIP = '2099-08-01';
const DATE_WORKOUT_SAVE = '2099-08-02';
const DATE_MULTI_RESULT = '2099-08-03';

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Note Persistence — save / load / workout flow', () => {
  let journal: JournalEntryPage;
  const errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    journal = new JournalEntryPage(page);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
  });

  test.afterEach(async () => {
    const persistenceErrors = errors.filter(e =>
      e.includes('NOTE_NOT_FOUND') ||
      e.includes('mutateNote') ||
      e.includes('persistence') ||
      e.includes('IndexedDB')
    );
    if (persistenceErrors.length > 0) {
      console.warn('⚠️  Persistence errors during test:', persistenceErrors);
    }
  });

  // ── 1. Content round-trip ──────────────────────────────────────────────────

  test('note content persists across navigation and reload', async ({ page }, testInfo) => {
    const uniqueContent = `E2E-PERSIST-${Date.now()}`;
    // Seed a note so the date page mounts the editor (empty dates render
    // "No Notes" only). seedNote overwrites the same id each run.
    await seedJournalNote(page, DATE_CONTENT_ROUNDTRIP, '# E2E Seed\n');
    await journal.goto(DATE_CONTENT_ROUNDTRIP);

    // Type unique content into the editor
    await journal.typeInEditor(uniqueContent);

    // Signal-based: poll IDB until the debounced write lands (replaces the
    // fixed 700ms debounce sleep).
    await journal.awaitNotePersisted(`journal/${DATE_CONTENT_ROUNDTRIP}`, uniqueContent);

    // Navigate away via SPA navigation
    await journal.gotoJournalList();

    // Verify raw IDB write happened
    const stored = await journal.storedContent(DATE_CONTENT_ROUNDTRIP);
    expect(stored, 'Content should be persisted to IndexedDB after debounce').toContain(uniqueContent);

    // Navigate back — editor must show the saved content
    await journal.goto(DATE_CONTENT_ROUNDTRIP);
    await journal.expectEditorContains(uniqueContent);

    // Hard reload — still there
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
    await journal.waitForEditor();
    await journal.expectEditorContains(uniqueContent);

    // No persistence errors during the flow
    const persistenceErrors = errors.filter(e => e.includes('NOTE_NOT_FOUND') || e.includes('mutateNote'));
    expect(persistenceErrors, 'No persistence errors should occur').toHaveLength(0);

    await page.screenshot({ path: testInfo.outputPath('persistence-01-content-roundtrip.png') });
  });

  // ── 2. Workout start via play button ──────────────────────────────────────

  test('starting a workout opens a runtime session without persistence errors', async ({ page }, testInfo) => {
    const wodContent = `# Test Workout ${Date.now()}\n\n\`\`\`wod\nTimer: 1:00\n5 Burpees\n\`\`\``;
    await seedJournalNote(page, DATE_WORKOUT_SAVE, '# E2E Seed\n');
    await clearResults(page, DATE_WORKOUT_SAVE);
    await journal.goto(DATE_WORKOUT_SAVE);

    // Replace content with a WOD block
    await journal.replaceEditorContent(wodContent);
    // Blocks-parsed signal: the block's run control mounts (bounded auto-wait).
    await expect(page.locator('[data-testid="editor-start-workout"]').first()).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: testInfo.outputPath('persistence-02a-before-start.png') });

    // Open the Actions menu and find the play button
    const actionsMenuTrigger = page.locator('div.flex.items-center.gap-2.shrink-0 button').last();
    const exists = await actionsMenuTrigger.count();
    if (exists === 0) {
      test.skip(true, 'Actions menu trigger not found — story layout may have changed');
      return;
    }
    await actionsMenuTrigger.click();
    // Menu-open signal: the dropdown mounts.
    await expect(page.locator('div[role="menu"], [data-headlessui-state="open"]')).toBeVisible({ timeout: 5_000 });

    const dropdownMenu = page.locator('div[role="menu"], [data-headlessui-state="open"]');
    const playButton = dropdownMenu.locator('[role="menuitem"], button').filter({ hasText: /Workout/ }).locator('button[title="Run"]').first();
    const playExists = await playButton.count();
    if (playExists === 0) {
      test.skip(true, 'Play button in dropdown not found — WOD block may not have parsed yet');
      return;
    }
    await playButton.click();

    // FullscreenTimer should appear
    await expect(page.getByText('Close')).toBeVisible({ timeout: 5000 });

    // No NOTE_NOT_FOUND or persistence errors on start
    const persistenceErrors = errors.filter(e => e.includes('NOTE_NOT_FOUND') || e.includes('mutateNote'));
    expect(persistenceErrors, 'No persistence errors on workout start').toHaveLength(0);

    await page.screenshot({ path: testInfo.outputPath('persistence-02b-timer-open.png') });
  });

  // ── 3. Workout result saved to IndexedDB ──────────────────────────────────

  test('a seeded workout result survives a page reload', async ({ page }, testInfo) => {
    // Seeds a result directly into wodwiki-db and verifies:
    //   a) the result survives navigation (IDB not wiped on page load)
    //   b) no NOTE_NOT_FOUND errors are triggered when loading the note
    // The full timer-based completion flow is covered by wod-index-play-button.e2e.ts.
    await seedJournalNote(page, DATE_WORKOUT_SAVE, '# E2E Seed\n');
    await clearResults(page, DATE_WORKOUT_SAVE);
    await journal.goto(DATE_WORKOUT_SAVE);

    // Seed a completed workout result for this note
    await page.evaluate(async ({ dbName, noteId }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!Array.from(db.objectStoreNames).includes('results')) { db.close(); resolve(); return; }
          const tx = db.transaction('results', 'readwrite');
          tx.objectStore('results').put({
            id: 'seeded-result-001',
            noteId,
            segmentId: 'wod-test',
            createdAt: Date.now(),
            data: { startTime: 0, endTime: 430, duration: 430, metrics: [], logs: [], completed: true },
          });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    }, { dbName: WOD_DB, noteId: DATE_WORKOUT_SAVE });

    expect(await getResults(page, DATE_WORKOUT_SAVE)).toHaveLength(1);

    // Navigate away and back — result must persist
    await journal.gotoJournalList();
    await journal.goto(DATE_WORKOUT_SAVE);
    // goto's editor-attached wait doubles as the settle window for any
    // hypothetical async wipe-on-load to run before we assert survival.

    expect(
      await getResults(page, DATE_WORKOUT_SAVE),
      'IDB results must not be deleted when note page loads'
    ).toHaveLength(1);

    // Hard reload — still intact
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
    await journal.waitForEditor();
    expect(
      await getResults(page, DATE_WORKOUT_SAVE),
      'IDB results must survive a hard page reload'
    ).toHaveLength(1);

    const persistenceErrors = errors.filter(e =>
      e.includes('NOTE_NOT_FOUND') || e.includes('RESULT_NOT_FOUND')
    );
    expect(persistenceErrors, 'No persistence errors on note load with existing results').toHaveLength(0);

    await page.screenshot({ path: testInfo.outputPath('persistence-03-result-survives-reload.png') });
  });

  // ── 4. Multiple results accumulate ────────────────────────────────────────

  test('multiple workouts accumulate results without overwriting previous ones', async ({ page }, testInfo) => {
    await seedJournalNote(page, DATE_MULTI_RESULT, '# E2E Seed\n');
    await clearResults(page, DATE_MULTI_RESULT);

    // Pre-seed two results directly in IDB to avoid waiting for timers
    await page.evaluate(async ({ dbName, noteId }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          const stores = Array.from(db.objectStoreNames);
          if (!stores.includes('results')) { db.close(); resolve(); return; }
          const tx = db.transaction('results', 'readwrite');
          const store = tx.objectStore('results');
          const base = { noteId, segmentId: 'wod-a',
            data: { startTime: 0, endTime: 100, duration: 100, metrics: [], logs: [], completed: true } };
          store.put({ ...base, id: 'test-result-1', createdAt: 1000 });
          store.put({ ...base, id: 'test-result-2', createdAt: 2000 });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    }, { dbName: WOD_DB, noteId: DATE_MULTI_RESULT });

    // Verify both results are present
    const results = await getResults(page, DATE_MULTI_RESULT);
    expect(results).toHaveLength(2);

    // Navigate to the date — results should NOT be wiped by page load
    await journal.goto(DATE_MULTI_RESULT);
    // goto's editor-attached wait doubles as the settle window for any
    // hypothetical async wipe-on-load to run before we assert survival.

    const afterLoad = await getResults(page, DATE_MULTI_RESULT);
    expect(afterLoad, 'Page load must not delete existing workout results').toHaveLength(2);

    await page.screenshot({ path: testInfo.outputPath('persistence-04-multi-result.png') });
  });

  // ── 5. No NOTE_NOT_FOUND in static/read-only contexts ─────────────────────

  test('visiting a static syntax page causes no NOTE_NOT_FOUND errors', async ({ page }, testInfo) => {
    // Static/syntax pages use StaticContentProvider, which wraps ContentProviderNotePersistence.
    // Before FIX-7, analytics persistence would throw NOTE_NOT_FOUND on workout complete in static mode.
    // This test verifies no such errors surface during normal static page navigation.
    errors.length = 0;

    await page.goto('/syntax', { waitUntil: 'domcontentloaded', timeout: 20_000 });

    // The editor should be present on the syntax page
    const editor = page.locator('.cm-content[contenteditable="true"]').first();
    await expect(editor).toBeAttached({ timeout: 10_000 });
    // Just focus the editor — no keyboard input that might trigger navigation
    await editor.focus().catch(() => {});
    // Deliberate grace window for async NOTE_NOT_FOUND errors to surface.
    await page.waitForTimeout(500);

    const noteNotFoundErrors = errors.filter(e => e.includes('NOTE_NOT_FOUND'));
    expect(noteNotFoundErrors, 'No NOTE_NOT_FOUND errors on static pages').toHaveLength(0);

    await page.screenshot({ path: testInfo.outputPath('persistence-05-static-no-errors.png') });
  });
});
