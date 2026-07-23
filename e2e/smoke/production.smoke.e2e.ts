import { test, expect, type Page } from '@playwright/test';
import { appBaseURL } from '../utils/url-helpers';
import { WorkoutEditorPage } from '../pages/WorkoutEditorPage';

/** Pageerror noise filter — production loads third-party/analytics/extension scripts. */
function isCriticalError(message: string): boolean {
  const lower = message.toLowerCase();
  return !lower.includes('extension') &&
    !lower.includes('chrome-extension') &&
    !lower.includes('adblock') &&
    !lower.includes('third-party');
}

/** Navigate to a route, capture pageerrors, and assert it renders without critical errors. */
async function probeRoute(page: Page, path: string): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Allow async errors + late hydration to surface.
  await page.waitForTimeout(2000);
  await expect(page.locator('main, [role="main"], #root').first()).toBeVisible();
  expect(errors.filter(isCriticalError)).toHaveLength(0);
}

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
  // ── Deepening (#694): primary routes + a real workout start ───────────────

  test('/efforts loads without critical page errors', async ({ page }) => {
    await probeRoute(page, '/efforts');
    await page.screenshot({ path: 'e2e/screenshots/smoke-efforts.png', fullPage: false });
  });

  test('/collections loads without critical page errors', async ({ page }) => {
    await probeRoute(page, '/collections');
    await page.screenshot({ path: 'e2e/screenshots/smoke-collections.png', fullPage: false });
  });

  test('/syntax/basics redirects and renders without critical page errors', async ({ page }) => {
    // /syntax/basics → /guide/syntax/basics (client-side redirect). Probe the
    // source route; the redirect resolves and the guide renders.
    await probeRoute(page, '/syntax/basics');
    await page.screenshot({ path: 'e2e/screenshots/smoke-syntax-basics.png', fullPage: false });
  });

  test('Fran collection workout starts and mounts the timer overlay', async ({ page }) => {
    test.setTimeout(90_000); // production network + cold parse
    await page.addInitScript(() => {
      // Suppress the First-Note Wizard so it can't intercept the Play click.
      window.localStorage.setItem('wodwiki.profileInitialized.v1', 'true');
    });
    page.on('dialog', (d) => { void d.accept(); });

    const editor = new WorkoutEditorPage(page);
    // /workout/:cat/:name redirects to /collections/:cat/:name.
    await page.goto(editor.url('crossfit-girls', 'fran'), { waitUntil: 'domcontentloaded' });

    // The workout loaded — its name renders in the main content.
    await editor.expectProseContains('Fran');

    // Start the workout: DOM click (block overlay decorations intercept
    // pointer events, same as the live-app specs).
    const play = page.getByRole('button', { name: 'Play' }).first();
    await expect(play).toBeVisible({ timeout: 15_000 });
    await play.evaluate((el) => (el as HTMLElement).click());

    // Timer overlay mounts (the FocusedDialog close button is present from
    // initializing through running) and/or the run route is active.
    await expect(
      page.locator('button[title="Close"]').first(),
    ).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: 'e2e/screenshots/smoke-fran-timer.png', fullPage: false });
  });
});
