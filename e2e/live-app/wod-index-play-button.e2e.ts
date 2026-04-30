import { test, expect } from '@playwright/test';
import { JournalEntryPage } from '../pages/JournalEntryPage';

const DATE_TEST = '2099-12-31';

test.describe('WOD Index Play Button — /journal/:date', () => {
  let journal: JournalEntryPage;
  const errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('pageerror', (e) => errors.push(e.message));

    journal = new JournalEntryPage(page);

    // Try to reach the local server, skip if not running
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch (e) {
      test.skip(true, 'Local dev server (localhost:5173) not running');
      return;
    }
  });

  test('shows play button in Actions menu and starts runtime session', async ({ page }) => {
    // 1. Prepare clean state
    await journal.clearStoredEntry(DATE_TEST);
    await journal.goto(DATE_TEST);

    // 2. Add a WOD block
    const wodContent = '# My Test\n\n```wod\nTimer: 10:00\n10 Burpees\n```';
    await journal.replaceEditorContent(wodContent);
    
    // Give React and NoteEditor time to parse blocks and update L3 items
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'e2e/screenshots/debug-before-actions.png' });

    // 3. Open Actions menu (the vertical ellipsis)
    // Try different possible locators for the trigger
    const actionsMenuTrigger = page.locator('div.flex.items-center.gap-2.shrink-0 button, div.flex.items-center.gap-4 button').last();
    await actionsMenuTrigger.click();

    // Small wait for menu to open
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/debug-dropdown-open.png' });

    // 4. Verify "On this page" section exists in the DROPDOWN
    const dropdownMenu = page.locator('div[role="menu"], [data-headlessui-state="open"]');
    await expect(dropdownMenu.getByText('On this page')).toBeVisible();
    
    // 5. Verify the play button (secondaryAction) is visible
    const workoutItem = dropdownMenu.locator('[role="menuitem"], button, a').filter({ hasText: 'Workout 1' });
    await expect(workoutItem).toBeVisible();
    
    const playButton = workoutItem.locator('button[title="Run"]');
    await expect(playButton).toBeVisible();

    // 6. Click the play button and verify it triggers the runtime
    await playButton.click();
    
    // 7. FullscreenTimer should appear. It has "Close" button.
    await expect(page.getByText('Close')).toBeVisible();

    // Current UX opens the session in Ready to Start state; click Play to start it.
    const startButton = page.locator('.title-play').last();
    if (await startButton.count()) {
      await startButton.click();
    } else {
      await page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).click();
    }

    // 8. Check for the Pause button icon class to verify it is running
    // The class title-pause is on the SVG/Lucide icon
    const pauseButton = page.locator('.title-pause');
    await expect(pauseButton).toBeVisible();

    // Verify the timer is present. It might be in a span or div.
    // Use a broader text search and first() to avoid strict mode violations
    const timerText = page.getByText(/^(10:00|09:59|09:58)$/).first();
    await expect(timerText).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/wod-runtime-started.png' });
  });
});
