import { test, expect } from '@playwright/test';
import { JournalEntryPage } from '../pages/JournalEntryPage';
import { seedJournalNote } from '../helpers/wodwikiDb';

const DATE_TEST = '2099-12-31';

test.describe('WOD Index Play Button — /journal/:date', () => {
  let journal: JournalEntryPage;
  const errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('pageerror', (e) => errors.push(e.message));

    journal = new JournalEntryPage(page);

    // Suppress the First-Note Wizard — its backdrop intercepts clicks on fresh
    // browser profiles (see runtime-execution.e2e.ts).
    await page.addInitScript(() => {
      window.localStorage.setItem('wodwiki.profileInitialized.v1', 'true');
    });

    // Try to reach the local server, skip if not running
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch (e) {
      test.skip(true, 'Local dev server (localhost:5173) not running');
      return;
    }
  });

  test('shows play button in Actions menu and starts runtime session', async ({ page }) => {
    // 1. Prepare clean state + seed a journal note with a WOD block (the
    // empty-date UX mounts no editor without one — #698).
    await journal.clearStoredEntry(DATE_TEST);
    await seedJournalNote(page, DATE_TEST, '# My Test\n\n```wod\nTimer: 10:00\n10 Burpees\n```\n');
    await journal.goto(DATE_TEST);

    // Give React and NoteEditor time to parse the WOD block
    await page.waitForTimeout(3000);

    // 3. The seeded WOD block renders a start-workout control
    // (data-testid="editor-start-workout", label "Run"). DOM-click it: the
    // block overlay's decoration layers can intercept pointer events. (The
    // editor's run control is "Run", not "Play" — a name:'Play' match would
    // hit the "Playground" nav button by substring.)
    const play = page.locator('[data-testid="editor-start-workout"]').first();
    await expect(play).toBeVisible({ timeout: 10_000 });
    await play.evaluate((el) => (el as HTMLElement).click());

    // 4. The timer overlay mounts (FullscreenTimer → FocusedDialog close
    // button) — the runtime session started from the date page. #700 allows
    // asserting up to overlay mounting; the inline timer uses autoStart.
    await expect(page.locator('button[title="Close"]').first()).toBeVisible({ timeout: 15_000 });

    // 5. The seeded workout's timer is live (Timer: 10:00 → shows ~10:00
    // counting down), proving the right workout started.
    await expect(page.getByText(/^10:0\d$/).first()).toBeVisible({ timeout: 10_000 });

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: 'e2e/screenshots/wod-runtime-started.png' });
  });
});
