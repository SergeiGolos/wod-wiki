import { test, expect } from '@playwright/test';

const HOMEVIEW_STORY_IFRAME_URL = '/iframe.html?id=catalog-pages-homeview--default&viewMode=story';
const STORY_LOAD_TIMEOUT_MS = 20000;

test.describe('Home page feature cards', () => {
  test('renders feature markdown as formatted list content', async ({ page }) => {
    await page.goto(HOMEVIEW_STORY_IFRAME_URL, { waitUntil: 'networkidle', timeout: STORY_LOAD_TIMEOUT_MS });

    // The landing page's "what's tracked" explainer renders as real list items with
    // inline links and code snippets.
    const trackedList = page.locator('ul').filter({
      has: page.getByRole('link', { name: 'Rounds', exact: true }),
    });
    await expect(trackedList).toBeVisible();

    const trackedItems = trackedList.getByRole('listitem');
    await expect(trackedItems).toHaveCount(5);

    const trackedLabels = ['Rounds', 'Movement', 'Reps', 'Load', 'Timers'];
    for (const label of trackedLabels) {
      await expect(trackedList.getByRole('link', { name: label, exact: true })).toBeVisible();
    }

    // Raw markdown syntax should not leak into the rendered page.
    const trackedText = await trackedList.innerText();
    expect(trackedText).not.toContain('**');
    expect(trackedText).not.toContain('- **');

    // Primary navigation sections and action CTAs render.
    await expect(page.getByRole('heading', { name: 'Learn the Syntax' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "What's Next" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Workout' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Results' })).toBeVisible();
  });
});
