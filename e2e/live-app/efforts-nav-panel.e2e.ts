import { expect, test, type Page } from '@playwright/test';
import { EffortsPage } from '../pages/EffortsPage';

function attachErrorCapture(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  return {
    expectClean() {
      expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toEqual([]);
      expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    },
  };
}

test.describe('Efforts nav panel', () => {
  test('shows origin and discipline filters on the catalog route', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoCatalog();
    await efforts.waitForSeedRegistry();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await efforts.waitForCatalogLoaded();

    await efforts.applyQuery('find:effort{discipline:kettlebell}');
    await expect(efforts.effortRow('kettlebell-swing')).toBeVisible();
    await expect(efforts.effortRow('burpee')).toHaveCount(0);

    await efforts.applyQuery('find:effort{origin:bundled}');
    await expect(efforts.effortRow('burpee')).toBeVisible();

    errors.expectClean();
  });

  test('filters to custom efforts when a user-defined effort exists', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoCatalog();
    await efforts.waitForSeedRegistry();
    await efforts.clearUserEfforts();
    await efforts.seedUserEffort({
      slug: 'qa-custom-effort',
      label: 'QA Custom Effort',
      discipline: 'strength',
      intensityTier: 'moderate',
      body: 'Custom effort body seeded from Playwright.',
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await efforts.waitForCatalogLoaded();
    await efforts.applyQuery('find:effort{origin:user}');

    await expect(efforts.effortRow('qa-custom-effort')).toBeVisible();
    await expect(efforts.effortRows()).toHaveCount(1);

    errors.expectClean();
  });

  test.fixme('shows recent workouts for the current effort on the detail route', async ({ page }) => { // e2e-remediation: EffortsNavPanel (origin/discipline filters + per-effort recent workouts) removed in 0d9c08f0 — no effort-scoped recent-workouts surface exists on the detail route
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoDetail('burpee');

    await expect(page).toHaveURL(/\/e\/burpee$/);

    errors.expectClean();
  });
});
