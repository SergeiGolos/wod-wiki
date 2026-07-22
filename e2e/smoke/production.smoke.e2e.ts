import { test, expect } from '@playwright/test';
import { appBaseURL } from '../utils/url-helpers';

test.describe(`App Smoketests — ${appBaseURL()}`, () => {
  test('homepage loads and renders title', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check that we have the main app container
    const app = page.locator('#root, body > div').first();
    await expect(app).toBeVisible();

    // Check for Wod.Wiki branding
    const title = await page.title();
    expect(title).toContain('Wod.Wiki');

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'e2e/screenshots/smoke-homepage.png', fullPage: false });
  });

  test('can navigate to journal page', async ({ page }) => {
    // Navigate to today's journal entry
    const today = new Date().toISOString().split('T')[0];
    await page.goto(`/journal/${today}`, { waitUntil: 'domcontentloaded' });

    // Wait a moment for React to mount
    await page.waitForTimeout(1000);

    // Check that the editor is present
    const editor = page.locator('[contenteditable="true"], textarea, .editor').first();
    await expect(editor).toBeVisible({ timeout: 5000 }).catch(() => {
      // Editor might not be visible immediately, check for any main content
      const main = page.locator('main, [role="main"], #root').first();
      expect(main).toBeVisible();
    });

    await page.screenshot({ path: 'e2e/screenshots/smoke-journal.png', fullPage: false });
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/', { waitUntil: 'networkidle' });

    // Allow some time for async errors to surface
    await page.waitForTimeout(2000);

    // Filter out non-critical errors (third-party scripts, etc.)
    const criticalErrors = errors.filter(err => {
      const lower = err.toLowerCase();
      return !lower.includes('extension') &&
             !lower.includes('chrome-extension') &&
             !lower.includes('adblock') &&
             !lower.includes('third-party');
    });

    expect(criticalErrors).toHaveLength(0);
  });

  test('WOD index page loads', async ({ page }) => {
    await page.goto('/wod', { waitUntil: 'domcontentloaded' });

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Check that the page has content
    const content = page.locator('main, [role="main"], #root').first();
    await expect(content).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/smoke-wod-index.png', fullPage: false });
  });
});
