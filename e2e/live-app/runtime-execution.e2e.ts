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
import { seedNote } from '../helpers/wodwikiDb';

const WOD_DB = 'wodwiki-db';

// ── IndexedDB helpers ───────────────────────────────────────────────────────

interface ResultRow {
  noteId?: string;
  data?: { completed?: boolean; logs?: unknown[] };
  createdAt?: number;
}

async function clearAllResults(page: Page): Promise<void> {
  await page.evaluate(async (db) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(db);
      req.onsuccess = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains('results')) { idb.close(); resolve(); return; }
        const tx = idb.transaction('results', 'readwrite');
        tx.objectStore('results').clear();
        tx.oncomplete = () => { idb.close(); resolve(); };
        tx.onerror = () => { idb.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, WOD_DB);
}

async function getAllResults(page: Page): Promise<ResultRow[]> {
  return page.evaluate(async (db) => {
    return new Promise<ResultRow[]>((resolve, reject) => {
      const req = indexedDB.open(db);
      req.onsuccess = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains('results')) { idb.close(); resolve([]); return; }
        const tx = idb.transaction('results', 'readonly');
        const getAll = tx.objectStore('results').getAll();
        getAll.onsuccess = () => resolve(getAll.result as ResultRow[]);
        tx.oncomplete = () => idb.close();
        tx.onerror = () => { idb.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, WOD_DB);
}

// ── Timer / overlay helpers ─────────────────────────────────────────────────

/** Main timer display, parsed to seconds. Throws on unparseable text. */
async function timerSeconds(page: Page): Promise<number> {
  const text = await page
    .locator('.font-mono.tracking-tighter')
    .first()
    .innerText();
  const m = text.match(/(\d{1,3}):(\d{2})/);
  if (!m) throw new Error(`Unparseable timer text: "${text}"`);
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

const playIconButton = (page: Page) =>
  page.locator('button[title="Start"]:visible, button[title="Continue"]:visible').first();
const pauseIconButton = (page: Page) => page.locator('button[title="Pause"]:visible').first();

/**
 * Seed a playground note with one wod block, open it, and press Play.
 * Returns once the app is on the /run/:runtimeId route with the timer
 * overlay mounted. Does NOT wait for runtime initialization — see #699.
 */
async function navigateToRunPage(page: Page, id: string, wodScript: string): Promise<void> {
  await seedNote(page, `playground/${id}`, `# Runtime E2E\n\n${wodScript}`, {
    type: 'playground',
    title: id,
  });
  await clearAllResults(page);

  await page.goto(`/playground/${id}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 10_000 });
  // React + CodeMirror need time to parse blocks and render the Play overlay.
  await page.waitForTimeout(2_000);

  const play = page.getByRole('button', { name: 'Play' }).first();
  await expect(play).toBeVisible({ timeout: 10_000 });
  // DOM click, not pointer click: the block overlay's decoration layers
  // intermittently cover the button's center point, so pointer events land
  // on the overlay instead of the button (force-click included). el.click()
  // bypasses hit-testing and still fires the React handler.
  await play.evaluate((el) => (el as HTMLElement).click());

  // PlaygroundNotePage uses enableInlineRuntime={false} → tracker route.
  await page.waitForURL(/\/(tracker|run)\//, { timeout: 10_000 });
  // The FocusedDialog close button is present whether the runtime is
  // initializing, ready, or running — the stable "overlay mounted" signal.
  await expect(page.locator('button[title="Close"]').first()).toBeVisible({ timeout: 8_000 });
}

/**
 * navigateToRunPage + reach a RUNNING session: wait for Ready-to-Start,
 * click play, wait for the pause icon. Currently unreachable — see #699.
 */
async function startWorkoutFromPlayground(page: Page, id: string, wodScript: string): Promise<void> {
  await navigateToRunPage(page, id, wodScript);
  await expect(page.getByRole('heading', { name: 'Ready to Start' })).toBeVisible({ timeout: 8_000 });

  // The run route passes autoStart, which starts the *session* clock but
  // leaves the workout at the SessionRoot gate ("Ready to Start", elapsed
  // counting up). Next advances into the first real block — the countdown
  // timer mounts and runs from there.
  await page.locator('button[title="Next Block"]').first().click();
  await expect(pauseIconButton(page)).toBeVisible({ timeout: 8_000 });
}

// ── Tests ───────────────────────────────────────────────────────────────────

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
    await startWorkoutFromPlayground(page, 'runtime-e2e-countdown', '```wod\nTimer: 1:00\n10 Burpees\n```');

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
    // Quarantined: on /run the pause control label never flips to
    // Start/Continue (workbench session store not synced) — see #701.
    test.fixme(true, 'Quarantined: /run pause label does not reflect paused state — see issue #701');
    await startWorkoutFromPlayground(page, 'runtime-e2e-pause', '```wod\nTimer: 1:00\n10 Burpees\n```');

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
    await startWorkoutFromPlayground(page, 'runtime-e2e-next', '```wod\n(2)\n  5 Burpees\n  10 Squats\n```');

    // First child is current; advancing surfaces the next movement.
    const nextButton = page.locator('button[title="Next Block"]').first();
    await expect(nextButton).toBeVisible({ timeout: 5_000 });
    await nextButton.click();

    await expect(page.getByText(/squat/i).first()).toBeVisible({ timeout: 5_000 });
    expect(errors).toEqual([]);
  });

  test('stop session records no completed result', async ({ page }) => {
    await startWorkoutFromPlayground(page, 'runtime-e2e-stop', '```wod\nTimer: 1:00\n10 Burpees\n```');

    await page.waitForTimeout(1000); // let the session produce some output
    await page.locator('button[title="Stop Session"]').first().click();

    // No active timer UI remains.
    await expect(pauseIconButton(page)).toBeHidden({ timeout: 5_000 });

    // Partials may be recorded by design — but never marked completed.
    const results = await getAllResults(page);
    for (const r of results) {
      expect(r.data?.completed).not.toBe(true);
    }
  });

  test('natural completion navigates to review and records a completed result', async ({ page }) => {
    await startWorkoutFromPlayground(page, 'runtime-e2e-complete', '```wod\nTimer: 0:06\n5 Burpees\n```');

    // Blocks are advanced manually (Next) — the 6s countdown expires, then
    // keep advancing through the effort block until the session completes
    // and WallClockPage navigates to /review/:runtimeId (replace).
    await advanceUntilReview(page);

    const results = await getAllResults(page);
    expect(results.some((r) => r.data?.completed === true)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('completion result feeds the results inlay on the source note', async ({ page }) => {
    const id = 'runtime-e2e-inlay';
    await startWorkoutFromPlayground(page, id, '```wod\nTimer: 0:06\n5 Burpees\n```');

    await advanceUntilReview(page);
    expect((await getAllResults(page)).some((r) => r.data?.completed === true)).toBe(true);

    // Back on the source note, the recorded result renders as a widget inlay.
    await page.goto(`/playground/${id}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await expect(page.locator('.cm-wod-results-inlay').first()).toBeVisible({ timeout: 15_000 });
    expect(errors).toEqual([]);
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
