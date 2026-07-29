import { test, expect } from '@playwright/test';

const HOMEVIEW_STORY_IFRAME_URL = '/iframe.html?id=catalog-pages-homeview--default&viewMode=story';
const STORY_LOAD_TIMEOUT_MS = 20000;

test.describe('Home page scroll walkthrough', () => {
  test('renders the hero and the live editor tour window', async ({ page }) => {
    await page.goto(HOMEVIEW_STORY_IFRAME_URL, { waitUntil: 'networkidle', timeout: STORY_LOAD_TIMEOUT_MS });

    const tour = page.locator('[data-testid="home-tour"]');
    await expect(tour).toBeVisible();

    // Hero headline — the four product surfaces, one per row.
    const headline = tour.getByRole('heading', { level: 1 });
    await expect(headline).toContainText('Write it in Markdown');
    await expect(headline).toContainText('Run it as a Timer');
    await expect(headline).toContainText('Own the Metrics');
    await expect(headline).toContainText('Visualize the Analytics');

    // The tour window mounts the REAL note editor (CodeMirror), not mock markup.
    await expect(tour.locator('.cm-editor')).toBeVisible();

    // The overview caption introduces the loop.
    await expect(tour.getByText('The whole workout lifecycle.')).toBeVisible();

    // The runway (scroll-driven stages) is present on desktop.
    const runway = tour.locator('section', { has: page.locator('[data-testid="tour-captions"]') });
    await expect(runway).toBeVisible();

    // Real actions on the editor screen: Run + share.
    await expect(tour.getByRole('button', { name: 'Run', exact: true })).toBeVisible();
    await expect(tour.getByRole('button', { name: 'Copy share link' })).toBeVisible();
  });
});
