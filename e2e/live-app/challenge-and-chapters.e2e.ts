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

import { expect, test } from '@playwright/test';

const LEDGER_KEY = 'wodwiki.quests.v1';

async function clearLedger(page: import('@playwright/test').Page) {
  await page.evaluate((k) => {
    window.localStorage.removeItem(k);
  }, LEDGER_KEY);
}

async function seedLedger(
  page: import('@playwright/test').Page,
  entries: Record<string, Record<string, boolean>>,
) {
  await page.evaluate(
    ({ k, v }) => {
      window.localStorage.setItem(k, JSON.stringify(v));
    },
    { k: LEDGER_KEY, v: entries },
  );
}

async function getEditorView(page: import('@playwright/test').Page) {
  // The canvas editor exposes the CodeMirror view via the NoteEditor ref
  // (see NoteEditor.tsx). The view is reachable through the .cm-editor
  // element's parent in the test DOM.
  return page.evaluateHandle(() => {
    const el = document.querySelector('.cm-editor')?.parentElement as
      | (HTMLElement & { __codemirrorView?: any })
      | null;
    if (!el?.__codemirrorView) {
      throw new Error('CodeMirror view was not exposed for test automation');
    }
    return el.__codemirrorView;
  });
}

async function setEditorContent(
  page: import('@playwright/test').Page,
  content: string,
) {
  const handle = await getEditorView(page);
  await page.evaluate(
    ([view, text]) => {
      (view as any).dispatch({
        changes: { from: 0, to: (view as any).state.doc.length, insert: text },
      });
      (view as any).focus();
    },
    [handle, content],
  );
  // Give the React tree a tick to flush `onBlocksChange` and revalidate.
  await page.waitForTimeout(200);
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
      '```wod\n(3 Rounds)\n  10 KB Swings\n  *:30 Rest\n```',
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

    await expect(firstCompleted('chapter-row-basics'), 'Basics chapter row should be complete on /').toBe('true');
    await expect(firstCompleted('chapter-row-sequences'), 'Sequences chapter row should still be incomplete on /').toBe('false');
  });

  test('localStorage clear resets all quests across all pages', async ({ page }) => {
    // Pre-seed a non-empty ledger.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedLedger(page, {
      '/challenge': { 'first-movement': true },
      '/chapters/basics': { 'basics-movement': true, 'basics-reps': true },
    });

    // Verify the seeded state surfaces in the OnboardingBanner popover
    // (the rows render in two visibility variants; assert the first one).
    await page.waitForSelector('[data-testid="chapter-row-basics"]');
    let basicsCompleted = await page.locator('[data-testid="chapter-row-basics"]').first().getAttribute('data-completed');
    expect(basicsCompleted).toBe('true');

    // Clear the ledger via the public surface (clearLedger) and reload.
    await clearLedger(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="chapter-row-basics"]');
    basicsCompleted = await page.locator('[data-testid="chapter-row-basics"]').first().getAttribute('data-completed');
    expect(basicsCompleted).toBe('false');
  });
});
