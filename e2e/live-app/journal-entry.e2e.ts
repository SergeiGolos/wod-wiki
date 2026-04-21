/**
 * Journal Entry E2E Tests
 *
 * Validates the /journal/:date route:
 * 1. New entries load with the default template
 * 2. Edited content is saved when navigating away normally (≥500ms debounce)
 * 3. Edited content is saved when navigating away before the 500ms debounce fires
 *    (validates the flush-on-unmount fix in usePlaygroundContent)
 * 4. Content survives a full page reload
 *
 * Tests run against the live app at https://pluto.forest-adhara.ts.net:5173
 * via playwright.journal.config.ts.
 *
 * Test isolation: each test uses a unique stable date in 2099 that is cleared
 * in the IndexedDB before the test begins.
 */

import { test, expect } from '@playwright/test';
import { JournalEntryPage } from '../pages/JournalEntryPage';

// Stable test dates — far future so they never conflict with real entries
const DATE_LOAD = '2099-06-01';
const DATE_SAVE_NORMAL = '2099-06-02';
const DATE_SAVE_QUICK = '2099-06-03';
const DATE_RELOAD = '2099-06-04';

test.describe('Journal Entry — /journal/:date', () => {
  let journal: JournalEntryPage;
  const errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('pageerror', (e) => errors.push(e.message));
    journal = new JournalEntryPage(page);

    // Navigate once to seed IndexedDB access before clearing
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
  });

  test.afterEach(() => {
    if (errors.length > 0) {
      console.warn('Page errors during test:', errors);
    }
  });

  // ── 1. New entry loads default template ──────────────────────────────────

  test('loads default template for a new (unsaved) date', async () => {
    await journal.clearStoredEntry(DATE_LOAD);
    await journal.goto(DATE_LOAD);

    // Template always contains "# My Workout" as the heading
    await journal.expectEditorContains('My Workout');

    // No page errors
    expect(errors).toHaveLength(0);

    await journal.page.screenshot({ path: 'e2e/screenshots/journal-entry-01-template.png' });
  });

  // ── 2. Content saved after normal debounce (≥500ms) ──────────────────────

  test('saves content after waiting for debounce then navigating away', async () => {
    const uniqueText = `E2E-SAVE-NORMAL-${Date.now()}`;
    await journal.clearStoredEntry(DATE_SAVE_NORMAL);
    await journal.goto(DATE_SAVE_NORMAL);

    await journal.typeInEditor(uniqueText);

    // Wait longer than the 500ms debounce so the save fires normally
    await journal.page.waitForTimeout(700);

    // Navigate away
    await journal.gotoJournalList();

    // Verify IndexedDB was written
    const stored = await journal.storedContent(DATE_SAVE_NORMAL);
    expect(stored).toContain(uniqueText);

    // Navigate back — editor must show the saved content
    await journal.goto(DATE_SAVE_NORMAL);
    await journal.expectEditorContains(uniqueText);

    await journal.page.screenshot({ path: 'e2e/screenshots/journal-entry-02-save-normal.png' });
  });

  // ── 3. Content saved on quick navigation (unmount flush) ──────────────────

  test('saves content when navigating away before 500ms debounce fires', async () => {
    const uniqueText = `E2E-SAVE-QUICK-${Date.now()}`;
    await journal.clearStoredEntry(DATE_SAVE_QUICK);
    await journal.goto(DATE_SAVE_QUICK);

    await journal.typeInEditor(uniqueText);

    // Navigate away immediately — well within the 500ms debounce window.
    // usePlaygroundContent.flush() must fire on component unmount so this content is not lost.
    await journal.gotoJournalList();

    // Short pause to let any async IDB write complete
    await journal.page.waitForTimeout(300);

    // Verify IndexedDB was written despite quick navigation
    const stored = await journal.storedContent(DATE_SAVE_QUICK);
    expect(stored).toContain(uniqueText);

    // Navigate back — content must appear
    await journal.goto(DATE_SAVE_QUICK);
    await journal.expectEditorContains(uniqueText);

    await journal.page.screenshot({ path: 'e2e/screenshots/journal-entry-03-save-quick.png' });
  });

  // ── 4. Content survives a full page reload ────────────────────────────────

  test('content persists across a hard page reload', async () => {
    const uniqueText = `E2E-RELOAD-${Date.now()}`;
    await journal.clearStoredEntry(DATE_RELOAD);
    await journal.goto(DATE_RELOAD);

    await journal.typeInEditor(uniqueText);

    // Wait for debounce to fire
    await journal.page.waitForTimeout(700);

    // Hard reload
    await journal.page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
    await journal.waitForEditor();

    await journal.expectEditorContains(uniqueText);

    await journal.page.screenshot({ path: 'e2e/screenshots/journal-entry-04-reload.png' });
  });

  // ── 5. Title shows the date ───────────────────────────────────────────────

  test('page title reflects the journal date', async () => {
    await journal.clearStoredEntry(DATE_LOAD);
    await journal.goto(DATE_LOAD);

    // The date appears somewhere in the page title / heading
    // e.g. "June 1, 2099" or "2099-06-01"
    const titleText = await journal.title().innerText();
    // Accepts any format that includes the year
    expect(titleText).toMatch(/2099/);

    await journal.page.screenshot({ path: 'e2e/screenshots/journal-entry-05-title.png' });
  });
});
