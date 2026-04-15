import { test, expect } from '@playwright/test';
import { JournalEntryPage } from './pages/JournalEntryPage';

// Local dev URL for manual running or local E2E
const LOCAL_APP_URL = 'http://localhost:5173';
const DATE_TEST = '2099-12-31';

test.describe('WOD Index Play Button — /journal/:date', () => {
  let journal: JournalEntryPage;
  const errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors.length = 0;
    page.on('pageerror', (e) => errors.push(e.message));
    
    // Override the hardcoded APP_URL in the page object for this test
    journal = new JournalEntryPage(page);
    
    // Try to reach the local server, skip if not running
    try {
      await page.goto(LOCAL_APP_URL, { waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch (e) {
      test.skip(true, 'Local dev server (localhost:5173) not running');
      return;
    }
  });

  test('shows play button in Actions menu when a WOD block is added', async ({ page }) => {
    // 1. Prepare clean state
    await journal.clearStoredEntry(DATE_TEST);
    await page.goto(`${LOCAL_APP_URL}/journal/${DATE_TEST}`);
    await journal.waitForEditor();

    // 2. Add a WOD block
    const wodContent = '```wod\nTimer: 10:00\n10 Burpees\n```';
    await journal.replaceEditorContent(wodContent);
    
    // Give React and NoteEditor time to parse blocks and update L3 items
    await page.waitForTimeout(1000);

    // 3. Open Actions menu (the vertical ellipsis)
    const actionsButton = page.locator('button[aria-label="Actions"]').first();
    // Wait for the button to be visible — might be inside the ActionsMenu component
    // In App.tsx it's: <EllipsisVerticalIcon data-slot="icon" className="size-5 text-zinc-500" />
    // within a <DropdownButton plain>
    const actionsMenuTrigger = page.locator('button').filter({ hasText: '' }).locator('svg.text-zinc-500').first();
    await actionsMenuTrigger.click();

    // 4. Verify "On this page" section exists and has "Workout 1"
    await expect(page.getByText('On this page')).toBeVisible();
    
    // 5. Verify the play button (secondaryAction) is visible
    // In our update: <button className="col-start-5 ..."><PlayIcon ... /></button>
    const workoutItem = page.locator('div[role="menuitem"]').filter({ hasText: 'Workout 1' });
    await expect(workoutItem).toBeVisible();
    
    const playButton = workoutItem.locator('button[title="Run"]');
    await expect(playButton).toBeVisible();

    // 6. Click the play button and verify it triggers the runtime
    await playButton.click();
    
    // FullscreenTimer should appear. It has "Close" button.
    await expect(page.getByText('Close')).toBeVisible();
    await expect(page.getByText('10:00')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/wod-play-button-actions-menu.png' });
  });
});
