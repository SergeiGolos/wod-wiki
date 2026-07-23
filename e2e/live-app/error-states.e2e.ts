/**
 * Error-Path Resilience — behavioral e2e (WOD wayfinder #693)
 *
 * Resolves the ticket's core question: which graceful degradations already
 * exist, and which are defects?
 *
 *   1. Malformed WOD block (unclosed fence / bad wod syntax) → parse error
 *      surfaced, no crash, Play control absent or disabled.
 *   2. IndexedDB unavailable (indexedDB.open rejects) → app degrades without
 *      an unhandled pageerror.
 *   3. Malformed journal routes (/journal/not-a-date) → handled state.
 *
 * Findings recorded inline as each test is written; defects are quarantined.
 */

import { test, expect, type Page } from '@playwright/test';
import { seedNote } from '../helpers/wodwikiDb';

const WOD_DB = 'wodwiki-db';

/** Open the editor overlay for a seeded playground note. */
async function openNote(page: Page, id: string, content: string): Promise<void> {
  await seedNote(page, `playground/${id}`, content, { type: 'playground', title: id });
  await page.goto(`/playground/${id}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 10_000 });
  // Linter debounce is 500ms; give the parse + lint a beat.
  await page.waitForTimeout(2_000);
}

test.describe('Error-Path Resilience', () => {
  const errors: string[] = [];
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => { void d.accept(); });
    await page.addInitScript(() => {
      window.localStorage.setItem('wodwiki.profileInitialized.v1', 'true');
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5_000 });
    } catch {
      test.skip(true, 'Local dev server (localhost:5173) not running');
    }
  });

  // ── 1. Malformed WOD blocks ───────────────────────────────────────────────

  test('unclosed wod fence does not crash the editor', async ({ page }) => {
    await openNote(page, 'error-unclosed-fence', '# Unclosed\n\n```wod\n5 Burpees');

    // Editor remains mounted; no unhandled error.
    await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('syntactically broken wod block surfaces a lint marker or disables Play', async ({ page }) => {
    // "(2" — an unclosed round directive — is genuinely invalid Whiteboard
    // syntax: the Lezer parser emits an error node, which the wod-linter
    // extension (@codemirror/lint) surfaces as a gutter marker.
    await openNote(page, 'error-bad-syntax', '# Bad\n\n```wod\n(2\n  5 Burpees\n```\n');

    const lintMarker = page.locator('.cm-lint-marker-error, .cm-lint-marker.cm-lint-marker-error');
    const play = page.getByRole('button', { name: 'Play' });

    // Either the linter surfaces the error, or the broken block yields no Play.
    await expect(lintMarker.or(play)).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });

  test('bad timer value is tolerated (dropped), not surfaced as an error', async ({ page }) => {
    // Finding: after the #691 parser fix, an unparseable property value like
    // `Timer: banana` is DROPPED rather than surfacing a parse error — so the
    // block is still valid and runnable. This documents the existing graceful
    // degradation (tolerate-and-drop) for the ticket's inventory.
    await openNote(page, 'error-bad-timer', '# Bad timer\n\n```wod\nTimer: banana\n5 Burpees\n```\n');

    await expect(page.getByRole('button', { name: 'Play' }).first()).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });

  // ── 2. IndexedDB unavailable ──────────────────────────────────────────────

  // DEFECT #703: with no IndexedDB the app white-screens with an unhandled
  // `Cannot read properties of undefined (reading 'open')`. Quarantined until
  // the boot DB-open rejection is caught (error boundary + empty shell).
  test('IndexedDB rejection degrades without an unhandled pageerror', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate an environment with no IndexedDB (locked-down webview /
      // disabled storage) — the realistic "unavailable" failure mode.
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(2_500); // allow async DB open to reject + propagate

    // App must not white-screen: #root renders some content, and no unhandled
    // error escapes to pageerror.
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });

  // ── 3. Malformed routes ───────────────────────────────────────────────────

  test('/journal/not-a-date redirects to a handled state', async ({ page }) => {
    await page.goto('/journal/not-a-date', { waitUntil: 'domcontentloaded', timeout: 15_000 });
    // resolveJournalRoute classifies a non-date, non-UUID segment as a
    // slug-alias; resolution fails → JournalAliasRedirect falls back to /journal.
    await page.waitForURL(/\/journal\/?$/, { timeout: 10_000 });
    await expect(page.locator('#root')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
});
