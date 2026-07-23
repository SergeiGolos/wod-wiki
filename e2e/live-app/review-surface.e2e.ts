/**
 * Review Surface — behavioral e2e (WOD wayfinder #692)
 *
 * Resolves the ticket's core question: does /review/:runtimeId render the
 * result a real workout completion actually produced?
 *
 *   1. Completed workout → review matches the executed script (movements +
 *      note label from the recorded WorkoutResult, not fixtures).
 *   2. Empty / corrupt result record → defensive state (no crash, no
 *      unhandled pageerror).
 *
 * Runtime helpers are copied from runtime-execution.e2e.ts (#691) — the
 * journal config runs each spec in isolation (workers: 1) and per-spec helper
 * copies are the established pattern here. Entry point is a seeded playground
 * note → Play → run → natural completion → /review/:runtimeId.
 *
 * Identity contract (CONTEXT.md): a WorkoutResult is keyed by runtimeId;
 * the Result Recorder stamps `noteId` and `blockContentId`. /review/:id reads
 * it via `indexedDBService.getResultById(runtimeId)`.
 */

import { test, expect, type Page } from '@playwright/test';
import { seedNote } from '../helpers/wodwikiDb';
import { ReviewPage } from '../pages/ReviewPage';

const WOD_DB = 'wodwiki-db';

// ── IndexedDB helpers (results store) ───────────────────────────────────────

/** Put a raw row into the `results` store (keyPath: 'id'). */
async function putResult(page: Page, row: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    async ({ db, row }) => {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(db);
        req.onsuccess = () => {
          const idb = req.result;
          if (!idb.objectStoreNames.contains('results')) {
            idb.close();
            reject(new Error('results store missing'));
            return;
          }
          const tx = idb.transaction('results', 'readwrite');
          tx.objectStore('results').put(row);
          tx.oncomplete = () => { idb.close(); resolve(); };
          tx.onerror = () => { idb.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    },
    { db: WOD_DB, row },
  );
}

// ── Runtime helpers (copied from runtime-execution.e2e.ts, #691) ────────────

const playIconButton = (page: Page) =>
  page.locator('button[title="Start"]:visible, button[title="Continue"]:visible').first();

async function navigateToRunPage(page: Page, id: string, wodScript: string): Promise<void> {
  await seedNote(page, `playground/${id}`, `# ${id}\n\n${wodScript}`, {
    type: 'playground',
    title: id,
  });
  await page.goto(`/playground/${id}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 10_000 });
  await page.waitForTimeout(2_000);

  const play = page.getByRole('button', { name: 'Play' }).first();
  await expect(play).toBeVisible({ timeout: 10_000 });
  // DOM click: block overlay decorations intercept pointer events.
  await play.evaluate((el) => (el as HTMLElement).click());

  await page.waitForURL(/\/(tracker|run)\//, { timeout: 10_000 });
  await expect(page.locator('button[title="Close"]').first()).toBeVisible({ timeout: 8_000 });
}

async function startWorkoutFromPlayground(page: Page, id: string, wodScript: string): Promise<void> {
  await navigateToRunPage(page, id, wodScript);
  await expect(page.getByRole('heading', { name: 'Ready to Start' })).toBeVisible({ timeout: 8_000 });
  await page.locator('button[title="Next Block"]').first().click();
  await expect(page.locator('button[title="Pause"]:visible').first()).toBeVisible({ timeout: 8_000 });
}

/** Click Next until the app lands on /review/ (or fail after maxClicks). */
async function advanceUntilReview(page: Page, maxClicks = 8): Promise<void> {
  for (let i = 0; i < maxClicks; i++) {
    if (/\/review\//.test(page.url())) return;
    const next = page.locator('button[title="Next Block"]:visible').first();
    if ((await next.count()) === 0) break;
    await next.click().catch(() => {});
    await page.waitForURL(/\/review\//, { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1_500);
  }
  await page.waitForURL(/\/review\//, { timeout: 5_000 });
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe('Review Surface — /review/:runtimeId', () => {
  const errors: string[] = [];
  test.setTimeout(120_000);

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

  test('completed workout → review matches the executed script', async ({ page }) => {
    const id = 'review-e2e-match';
    // Two rounds, two distinct movements → distinguishable per-round structure.
    const script = '```wod\n(2)\n  5 Burpees\n  10 Squats\n```';
    await startWorkoutFromPlayground(page, id, script);
    await advanceUntilReview(page);

    const review = new ReviewPage(page);
    await review.waitForLoad();
    await review.expectOverlayVisible();

    // The note label (Result Recorder stamps noteId → header title) and the
    // executed movements must come from the recorded WorkoutResult, not a
    // fixture. Title falls back to the id when noteId is a bare slug.
    await review.expectWorkoutLogVisible();
    await review.expectMovementVisible('Burpees');
    await review.expectMovementVisible('Squats');

    expect(errors).toEqual([]);
  });

  test('absent result id → defensive "Result not found." state', async ({ page }) => {
    const review = new ReviewPage(page);
    await review.goto(crypto.randomUUID());

    await expect(page.getByText('Result not found.')).toBeVisible({ timeout: 10_000 });
    // No review grid mounts for a missing record.
    await expect(review.reviewGrid()).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('result with empty logs → review mounts an empty grid, no crash', async ({ page }) => {
    const id = crypto.randomUUID();
    await putResult(page, {
      id,
      noteId: 'playground/empty-logs',
      data: { completed: true, logs: [], startTime: Date.now() },
      createdAt: Date.now(),
    });
    const review = new ReviewPage(page);
    await review.goto(id);
    await review.waitForLoad();
    await review.expectOverlayVisible();
    await review.expectWorkoutLogVisible();
    expect(errors).toEqual([]);
  });

  test('result with malformed logs → defensive state, no unhandled error', async ({ page }) => {
    const id = crypto.randomUUID();
    await putResult(page, {
      id,
      noteId: 'playground/bad-logs',
      data: { completed: true, logs: 'not-an-array' as unknown as never[], startTime: Date.now() },
      createdAt: Date.now(),
    });

    const review = new ReviewPage(page);
    await review.goto(id);

    // ReviewPage catches a throwing getAnalyticsFromLogs and renders the
    // "Failed to load result." error state — or, if it tolerates the shape,
    // still mounts without crashing. Either defensive branch is acceptable.
    const failure = page.getByText('Failed to load result.');
    const mounted = review.overlay();
    await expect(failure.or(mounted)).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });
});
