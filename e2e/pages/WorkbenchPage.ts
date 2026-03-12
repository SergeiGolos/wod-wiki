import { Page, expect } from '@playwright/test';

export class WorkbenchPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific testing story
   */
  async gotoTestingStory(storyName: string) {
    // Storybook URL format: /iframe.html?id=testing-workouts--loops-fixed&viewMode=story
    const id = `testing-workouts--${storyName.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')}`;
    await this.page.goto(`./iframe.html?id=${id}&viewMode=story`);
    await this.waitForWorkbenchReady();
  }

  /**
   * Wait for the workbench to be fully loaded
   */
  async waitForWorkbenchReady() {
    await expect(this.page.locator('text=STORYBOOK WORKBENCH')).toBeVisible();
  }

  /**
   * Switch between Plan, Track, and Review views
   */
  async switchView(view: 'plan' | 'track' | 'review') {
    const buttonLabel = view.charAt(0).toUpperCase() + view.slice(1);
    await this.page.click(`button:has-text("${buttonLabel}")`);
    
    // Wait for the view-specific content
    if (view === 'track') {
      await expect(this.page.locator('[title="Next Block"]')).toBeVisible();
    } else if (view === 'review') {
      await expect(this.page.locator('table')).toBeVisible();
    }
  }

  /**
   * Workout Controls
   */
  async startWorkout() {
    const playButton = this.page.locator('.title-play');
    if (await playButton.isVisible()) {
      await playButton.click();
    }
  }

  async pauseWorkout() {
    const pauseButton = this.page.locator('.title-pause');
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
    }
  }

  async nextBlock() {
    await this.page.click('[title="Next Block"]');
  }

  async stopWorkout() {
    await this.page.click('[title="Stop Session"]');
  }

  /**
   * State Reading
   */
  async getTimerText(): Promise<string> {
    const timer = this.page.locator('.font-mono.font-bold.tabular-nums');
    return (await timer.textContent()) || '';
  }

  async getActiveBlockLabel(): Promise<string> {
    // Main label in the timer display
    const label = this.page.locator('.relative.z-10.bg-white >> text=/[A-Za-z0-9]/').first();
    // This is a bit tricky due to nested structure, might need refinement
    // Based on TimerStackView, the main label is rendered above the time or near it
    // Let's try to find the label by looking for text that isn't the timer itself
    return (await label.textContent()) || '';
  }

  /**
   * Validations
   */
  async expectTimerValue(expectedMMSS: string) {
    await expect(this.page.locator('.font-mono.font-bold.tabular-nums')).toHaveText(expectedMMSS);
  }

  async expectActiveBlock(expectedLabel: string) {
    // In TimerStackView, the mainLabel is often rendered as a sub-header or inside the circle
    // Let's look for the label in the track view
    await expect(this.page.locator(`text=${expectedLabel}`)).toBeVisible();
  }

  async expectWorkoutCompleted() {
    // When completed, the timer usually shows 00:00 or total time and the stop button might change
    // Or we check the Review view
    await this.switchView('review');
    const rows = this.page.locator('tbody tr');
    await expect(rows).not.toHaveCount(0);
  }

  /**
   * Results Validation
   */
  async getResultsCount(): Promise<number> {
    await this.switchView('review');
    return await this.page.locator('tbody tr').count();
  }

  async expectResultRow(index: number, expectedData: Record<string, string>) {
    const row = this.page.locator('tbody tr').nth(index);
    for (const [column, value] of Object.entries(expectedData)) {
      // This assumes we can find the text in the row. 
      // More precise column matching would need GridHeader integration.
      await expect(row).toContainText(value);
    }
  }
}
