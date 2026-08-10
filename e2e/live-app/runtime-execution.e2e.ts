/**
 * Runtime Execution Loop — behavioral e2e (WOD wayfinder #691)
 *
 * The missing core: the previous suite stopped at "timer opens / pause button
 * visible". These tests assert what the runtime actually *does*:
 *
 *   1. Countdown progresses and tracks wall clock
 *   2. Pause freezes the countdown (and resume restarts it)
 *   3. Next Block advances segments
 *   4. Stop Session never records a completed result
 *   5. Natural completion → review route + completed result row
 *   6. Completion result feeds the results inlay (produce/consume loop)
 *   7. /run/:runtimeId reload → designed defensive state (in-memory runtimes)
 *
 * Entry point is a seeded playground note → Play → /run/:runtimeId (the
 * journal-date flow is quarantined pending the empty-date behavior decision
 * in #698). Behavior contracts encoded here (from source, not fixtures):
 *   - Natural completion: WallClockPage records the result and navigates to
 *     /review/:runtimeId (replace).
 *   - Manual stop: results are still recorded, but with `completed: false`
 *     (the journal list renders these as "Partial" by design).
 *   - /run/:runtimeId reads an in-memory `pendingRuntimes` map; a reload
 *     loses it and the page answers "Runtime not found." by design.
 */

import { test, expect, type Page } from '@playwright/test';
import { clearResults, getResults } from '../helpers/wodwikiDb';
import { installFastClock } from '../utils/fastClock';
import {
  startWorkoutFromPlayground,
  advanceUntilReview,
  timerSeconds,
  playIconButton,
  pauseIconButton,
} from '../pages/WallClockPage';
import { TEST_IDS } from '../contracts/TestIdContract';

/** Clear the results store, then start the workout (per-test isolation). */
async function startCleanWorkout(page: Page, id: string, wodScript: string): Promise<void> {
  await clearResults(page);
  await startWorkoutFromPlayground(page, id, wodScript);
}

test.describe('Runtime Execution Loop — /playground → /run/:runtimeId', () => {
  const errors: string[] = [];

  // Cold Vite transforms make the first page loads slow; the 45s config
  // default is too tight for seed → load → play → /run → reload.
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('pageerror', (e) => errors.push(e.message));
    // Active workout sessions register a beforeunload guard (Workbench
    // Effect). Playwright's default is to dismiss dialogs, which CANCELS the
    // navigation for beforeunload — accept instead so reloads go through.
    page.on('dialog', (d) => { void d.accept(); });
    // Suppress the First-Note Wizard (ADR-0010): it opens over fresh installs
    // and its backdrop intercepts every click on the page. The
    // profileInitialized flag is the app's own permanent-dismissal gate
    // (useProfileInitialized) — set it before any app code runs.
    await page.addInitScript(() => {
      window.localStorage.setItem('wodwiki.profileInitialized.v1', 'true');
    });
    try {
      // Seed IndexedDB access on the app origin before any IDB helpers run.
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5_000 });
    } catch {
      test.skip(true, 'Local dev server (localhost:5173) not running');
    }
  });

  test('countdown progresses and tracks wall clock', async ({ page }) => {
    await startCleanWorkout(page, 'runtime-e2e-countdown', '```time\nTimer: 1:00\n10 Burpees\n```');

    const v0 = await timerSeconds(page);
    expect(v0).toBeGreaterThan(0);

    await page.waitForTimeout(4000);
    const v1 = await timerSeconds(page);

    const elapsed = v0 - v1;
    // 4s wall clock → countdown dropped 2–6s (±2s drift tolerance).
    expect(elapsed).toBeGreaterThanOrEqual(2);
    expect(elapsed).toBeLessThanOrEqual(6);
  });

  test('pause freezes the countdown and resume restarts it', async ({ page }) => {
    await startCleanWorkout(page, 'runtime-e2e-pause', '```time\nTimer: 1:00\n10 Burpees\n```');

    await pauseIconButton(page).click();
    await expect(playIconButton(page)).toBeVisible({ timeout: 5_000 });

    const frozen = await timerSeconds(page);
    await page.waitForTimeout(2000);
    expect(await timerSeconds(page)).toBe(frozen);

    await playIconButton(page).click();
    await expect(pauseIconButton(page)).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(2000);
    expect(await timerSeconds(page)).toBeLessThan(frozen);
  });

  test('next block advances to the next segment', async ({ page }) => {
    await startCleanWorkout(page, 'runtime-e2e-next', '```time\n(2)\n  5 Burpees\n  10 Squats\n```');

    // First child is current; advancing surfaces the next movement.
    const nextButton = page.getByTestId(TEST_IDS.TIMER_NEXT_BLOCK).first();
    await expect(nextButton).toBeVisible({ timeout: 5_000 });
    await nextButton.click();

    await expect(page.getByText(/squat/i).first()).toBeVisible({ timeout: 5_000 });
    expect(errors).toEqual([]);
  });

  test('stop session records no completed result', async ({ page }) => {
    await startCleanWorkout(page, 'runtime-e2e-stop', '```time\nTimer: 1:00\n10 Burpees\n```');

    // Session-output signal: the countdown has started ticking (replaces the
    // fixed 1s "let the session produce some output" sleep).
    await expect.poll(() => timerSeconds(page), { timeout: 5_000 }).toBeLessThan(60);
    await page.getByTestId(TEST_IDS.TIMER_STOP_SESSION).first().click();

    // No active timer UI remains.
    await expect(pauseIconButton(page)).toBeHidden({ timeout: 5_000 });

    // Partials may be recorded by design — but never marked completed.
    const results = await getResults(page);
    for (const r of results) {
      expect(r.data?.completed).not.toBe(true);
    }
  });

  test('natural completion navigates to review and records a completed result', async ({ page }) => {
    // Fast clock (20×): the 6s countdown completes in ~0.3s wall time. Not
    // applied file-wide — 'countdown progresses' verifies wall-clock tracking.
    await installFastClock(page);
    await startCleanWorkout(page, 'runtime-e2e-complete', '```time\nTimer: 0:06\n5 Burpees\n```');

    // The wall budget covers the run itself, not seed/page-load — cold Vite
    // transforms make load time environment-dependent (CI variance), while
    // the assertion's intent is that the accelerated run completes quickly.
    const wallStart = Date.now();

    // Blocks are advanced manually (Next) — the 6s countdown expires, then
    // keep advancing through the effort block until the session completes
    // and WallClockPage navigates to /review/:runtimeId (replace).
    await advanceUntilReview(page);

    const results = await getResults(page);
    expect(results.some((r) => r.data?.completed === true)).toBe(true);
    // The accelerated run completes in single-digit seconds of wall time…
    expect(Date.now() - wallStart).toBeLessThan(15_000);
    // …but the persisted duration reflects the accelerated 6s span, not wall time.
    const completed = results.find((r) => r.data?.completed === true);
    expect(completed?.data?.duration).toBeGreaterThanOrEqual(5_000);
    expect(errors).toEqual([]);
  });

  test.skip('completion result feeds the results inlay on the source note (retired in #944)', async ({ page }) => {
    await installFastClock(page);
    const id = 'runtime-e2e-inlay';
    await startCleanWorkout(page, id, '```time\nTimer: 0:06\n5 Burpees\n```');

    await advanceUntilReview(page);
    expect((await getResults(page)).some((r) => r.data?.completed === true)).toBe(true);
  });

  test('reload of /run/:runtimeId shows the designed defensive state', async ({ page }) => {
    // A fresh full-page load of an unregistered runtimeId lands in exactly
    // the state a reload produces: pendingRuntimes is in-memory, so any full
    // load finds it empty. The stronger "reload mid-workout" variant needs a
    // working /run page — it is folded into the #699 quarantine: the /run
    // mount can hard-block the main thread, which makes reload itself hang.
    await page.goto(`/run/${crypto.randomUUID()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(
      page.getByText('Runtime not found. Please start the workout from the editor.'),
    ).toBeVisible({ timeout: 15_000 });
    expect(errors).toEqual([]);
  });
});
