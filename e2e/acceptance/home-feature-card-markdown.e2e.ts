import { test, expect } from '@playwright/test';

const HOMEVIEW_STORY_IFRAME_URL = '/iframe.html?id=catalog-pages-homeview--default&viewMode=story';
const STORY_LOAD_TIMEOUT_MS = 20000;

test.describe('Home page feature cards', () => {
  test('renders analytics feature markdown as formatted list content', async ({ page }) => {
    await page.goto(HOMEVIEW_STORY_IFRAME_URL, { waitUntil: 'networkidle', timeout: STORY_LOAD_TIMEOUT_MS });

    const analyticsSection = page.locator('#pre-post-analytics');

    await analyticsSection.scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /pre\s*&\s*post analytics/i })).toBeVisible();

    const listItems = analyticsSection.getByRole('listitem');
    await expect(listItems).toHaveCount(2);
    await expect(listItems.nth(0).locator('strong')).toHaveText('Pre-run');
    await expect(listItems.nth(1).locator('strong')).toHaveText('Post-run');

    await expect(analyticsSection).not.toContainText('**Pre-run**');
    await expect(analyticsSection).not.toContainText('- **Post-run**');
  });
});
