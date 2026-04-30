import { test, expect } from '@playwright/test';

const HOMEVIEW_STORY_IFRAME_URL = '/iframe.html?id=catalog-pages-homeview--default&viewMode=story';
const STORY_LOAD_TIMEOUT_MS = 20000;

test.describe('Home page feature cards', () => {
  test('renders feature markdown as formatted list content', async ({ page }) => {
    await page.goto(HOMEVIEW_STORY_IFRAME_URL, { waitUntil: 'networkidle', timeout: STORY_LOAD_TIMEOUT_MS });

    const smartTimerSection = page.locator('#smart-timer');
    const analyticsSection = page.locator('#pre-post-analytics');
    const chromecastSection = page.locator('#chromecast-home-gym-ready');
    const collectionsSection = page.locator('#collections-library');
    const librarySection = page.locator('#browse-the-library');

    await analyticsSection.scrollIntoViewIfNeeded();
    // HomeView stories must provide the same markdown source map as the app so the sticky panel renders real demo content.
    await expect(page.getByText('Source not found')).toHaveCount(0);

    await expect(smartTimerSection.getByRole('listitem')).toHaveText([
      'Counts up / down / interval based on your script',
      'Automatic advance between blocks',
      'Audio and visual cues for transitions',
      'Full-screen mode during workouts',
    ]);

    await expect(page.getByRole('heading', { name: /pre\s*&\s*post analytics/i })).toBeVisible();

    const listItems = analyticsSection.getByRole('listitem');
    await expect(listItems).toHaveCount(2);
    await expect(listItems.nth(0).locator('strong')).toHaveText('Pre:');
    await expect(listItems.nth(0)).toContainText('estimated time, total reps, projected volume');
    await expect(listItems.nth(1).locator('strong')).toHaveText('Post:');
    await expect(listItems.nth(1)).toContainText('actual vs. estimated, intensity graph, per-block breakdown');

    await expect(chromecastSection.getByRole('listitem')).toHaveText([
      'Cast the timer to any TV in your gym with one click',
      'Full-screen display readable from across the room',
    ]);

    await expect(collectionsSection.getByRole('listitem')).toHaveText([
      'Organize workouts into named collections',
      'Browse by category (strength, cardio, mobility)',
    ]);

    await expect(librarySection.getByText('Hundreds of ready-to-run workouts')).toBeVisible();

    await expect(analyticsSection).not.toContainText('**Pre:**');
    await expect(analyticsSection).not.toContainText('- **Post:**');
  });
});
