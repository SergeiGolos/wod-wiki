import { test, expect } from '@playwright/test';
import { JournalEntryPage } from './pages/JournalEntryPage';

// Local dev URL for manual running or local E2E
const LOCAL_APP_URL = 'https://localhost:5173';
const DATE_TEST = '2099-12-31';

test.describe('WOD Index Play Button — /journal/:date', () => {
  let journal: JournalEntryPage;
  const errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('pageerror', (e) => errors.push(e.message));
    
    journal = new JournalEntryPage(page, LOCAL_APP_URL);
    
    // Try to reach the local server, skip if not running
    try {
      await page.goto(LOCAL_APP_URL, { waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch (e) {
      test.skip(true, 'Local dev server (localhost:5174) not running');
      return;
    }
  });

  test('shows play button in Actions menu and starts runtime session', async ({ page }) => {
    // 1. Prepare clean state
    await journal.clearStoredEntry(DATE_TEST);
    await page.goto(`${LOCAL_APP_URL}/journal/${DATE_TEST}`);
    await journal.waitForEditor();

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
    
    // 7. Verify the runtime session has started
    // FullscreenTimer should appear. It has "Close" button.
    await expect(page.getByText('Close')).toBeVisible();
    
    // Check for the Pause button icon class to verify it is running
    const pauseButton = page.locator('.title-pause');
    await expect(pauseButton).toBeVisible();

    // Verify the timer is present and shows 10:00 initially or slightly less
    const timerText = page.locator('span.font-mono').filter({ hasText: /^(10:00|09:59|09:58)$/ });
    await expect(timerText).toBeVisible();

    // Wait 2 seconds and verify it has counted down
    await page.waitForTimeout(2000);
    const countedDownText = page.locator('span.font-mono').filter({ hasText: /^(09:5)/ });
    await expect(countedDownText).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/wod-runtime-started.png' });
  });
});
