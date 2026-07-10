/**
 * challenge-and-chapters.e2e.ts — End-to-end proof of #685 and #684.
 *
 * Closes the "live flip" gap that the unit + integration tests leave
 * unproven: a real user typing into the CodeMirror editor must
 *
 *   1. Flip the page-level `ChallengeBanner` row on /challenge.
 *   2. Mark the corresponding quest complete in the page-scoped ledger.
 *   3. Light up the same quest's chapter row in the home page's
 *      OnboardingBanner popover, even though the user is now on /.
 *
 * Run with the repro Playwright config (live Vite dev server on :5173):
 *
 *   bunx playwright test --config playwright.repro.config.ts \
 *     e2e/live-app/challenge-and-chapters.e2e.ts
 */

import { expect, test, type Page } from '@playwright/test';

const LEDGER_KEY = 'wodwiki.quests.v1';

async function clearLedger(page: Page) {
  await page.evaluate((k) => {
    window.localStorage.removeItem(k);
  }, LEDGER_KEY);
}

async function seedLedger(
  page: Page,
  entries: Record<string, Record<string, boolean>>,
) {
  await page.evaluate(
    ({ k, v }) => {
      window.localStorage.setItem(k, JSON.stringify(v));
    },
    { k: LEDGER_KEY, v: entries },
  );
}

async function getEditorView(page: Page) {
  // The canvas page renders the editor TWICE (desktop + mobile panels).
  // At a desktop viewport only one is visible. Pick the one whose
  // __codemirrorView is reachable from a visible .cm-editor element
  // (offsetParent !== null means display:none is OFF).
  return page.evaluateHandle(() => {
    const editors = Array.from(
      document.querySelectorAll('.cm-editor'),
    ) as Array<HTMLElement>;
    for (const ed of editors) {
      if (ed.offsetParent === null) continue;
      const parent = ed.parentElement as
        | (HTMLElement & { __codemirrorView?: any })
        | null;
      if (parent?.__codemirrorView) return parent.__codemirrorView;
    }
    throw new Error(
      'No visible CodeMirror view was exposed for test automation',
    );
  });
}

async function setEditorContent(
  page: Page,
  content: string,
) {
  // The NoteEditor's update listener (NoteEditor.tsx:554-557) fires
  // onBlocksChange on every view.dispatch that mutates the doc, so a
  // programmatic whole-doc replacement is sufficient to drive the
  // setLiveBlock → useSyntaxChallenge revalidation chain.
  await page.evaluate((text) => {
    const el = document.querySelector('.cm-editor')?.parentElement as
      | (HTMLElement & { __codemirrorView?: any })
      | null;
    const view = el?.__codemirrorView;
    if (!view) {
      throw new Error('CodeMirror view was not exposed for test automation');
    }
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  }, content);
  // Give React a tick to flush setLiveBlock → useSyntaxChallenge.
  await page.waitForTimeout(300);
}

test.describe('Challenge and chapter flows', () => {
  test.beforeEach(async ({ page }) => {
    // No strict error listeners here; Vite's HMR client can throw transient
    // errors during dev-server reconnects that do not affect the actual UI.
    // The assertions below verify behavior directly.
  });

  test('/challenge: typing into the wod block flips the ChallengeBanner live', async ({ page }) => {
    await page.goto('/challenge', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="challenge-banner"]', { timeout: 15_000 });
    await clearLedger(page);

    // All three quests start not-completed.
    for (const id of ['first-movement', 'first-timer', 'first-rounds']) {
      const completed = await page
        .getByTestId(`challenge-row-${id}`)
        .getAttribute('data-completed');
      expect(completed, `quest ${id} should start not-completed`).toBe('false');
    }

    // Type a 3-round wod block that satisfies all three quests at once.
    await setEditorContent(
      page,
      '```wod\n(3 Rounds)\n10 KB Swings\n*:30 Rest\n```',
    );


    // All three rows flip to data-completed="true".
    await expect
      .poll(async () => {
        return Promise.all(
          ['first-movement', 'first-timer', 'first-rounds'].map((id) =>
            page
              .getByTestId(`challenge-row-${id}`)
              .getAttribute('data-completed')
              .then((v) => v === 'true'),
          ),
        ).then((arr) => arr.every(Boolean));
      }, { timeout: 5_000 })
      .toBe(true);

    // The page-scoped ledger marks each quest under /challenge.
    const ledger = await page.evaluate((k) => {
      const raw = window.localStorage.getItem(k);
      return raw ? JSON.parse(raw) : null;
    }, LEDGER_KEY);
    expect(ledger).toMatchObject({
      '/challenge': {
        'first-movement': true,
        'first-timer': true,
        'first-rounds': true,
      },
    });
  });

  test('/chapters/basics: typing flips the page quest and the home popover badge', async ({ page }) => {
    // Seed: complete the basics quests on /chapters/basics.
    await page.goto('/chapters/basics', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="challenge-banner"]', { timeout: 15_000 });
    await clearLedger(page);

    // Type a single movement to satisfy basics-movement.
    await setEditorContent(page, '```wod\n10 KB Swings\n```');
    await expect
      .poll(async () => {
        const c = await page
          .getByTestId('challenge-row-basics-movement')
          .getAttribute('data-completed');
        return c === 'true';
      }, { timeout: 5_000 })
      .toBe(true);

    // Add a rep count to satisfy basics-reps.
    await setEditorContent(page, '```wod\n10 KB Swings\n5 reps\n```');
    await expect
      .poll(async () => {
        const c = await page
          .getByTestId('challenge-row-basics-reps')
          .getAttribute('data-completed');
        return c === 'true';
      }, { timeout: 5_000 })
      .toBe(true);

    // The home page popover renders each chapter row twice (mobile/desktop
    // visibility variants). Query the first one for the data-completed state.
    const firstCompleted = async (testId: string) => {
      return page.locator(`[data-testid="${testId}"]`).first().getAttribute('data-completed');
    };

    // Now navigate to / and assert the OnboardingBanner popover reflects
    // the /chapters/basics completion.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="onboarding-chapters"]', { state: 'attached' });

    const basicsCompleted = await firstCompleted('chapter-row-basics');
    const sequencesCompleted = await firstCompleted('chapter-row-sequences');
    expect(basicsCompleted, 'Basics chapter row should be complete on /').toBe('true');
    expect(sequencesCompleted, 'Sequences chapter row should still be incomplete on /').toBe('false');
  });

  test('localStorage clear resets all quests across all pages', async ({ page }) => {
    // Pre-seed a non-empty ledger, then reload so the OnboardingBanner
    // hook (which reads localStorage on mount) sees the seeded values.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedLedger(page, {
      '/challenge': { 'first-movement': true },
      '/chapters/basics': { 'basics-movement': true, 'basics-reps': true },
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // The chapter rows render in two visibility variants (desktop + mobile
    // popover). Use `state: 'attached'` to avoid waiting for visibility,
    // which hangs because two elements are matched.
    await page.waitForSelector('[data-testid="chapter-row-basics"]', { state: 'attached' });
    let basicsCompleted = await page.locator('[data-testid="chapter-row-basics"]').first().getAttribute('data-completed');
    expect(basicsCompleted).toBe('true');

    // Clear the ledger via the public surface (clearLedger) and reload.
    await clearLedger(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="chapter-row-basics"]', { state: 'attached' });
    basicsCompleted = await page.locator('[data-testid="chapter-row-basics"]').first().getAttribute('data-completed');
    expect(basicsCompleted).toBe('false');
  });
});
