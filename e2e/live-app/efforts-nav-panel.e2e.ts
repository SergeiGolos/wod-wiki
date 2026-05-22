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
    await efforts.openNavigationIfPresent();

    await expect(efforts.navOriginFilter().getByRole('button', { name: 'All', exact: true })).toHaveCount(1);
    await expect(efforts.navDisciplineFilter().getByRole('button', { name: 'kettlebell', exact: true })).toHaveCount(1);

    await efforts.selectDiscipline('kettlebell');
    await expect(efforts.effortRow('kettlebell-swing')).toBeVisible();
    await expect(efforts.effortRow('burpee')).toHaveCount(0);

    errors.expectClean();
  });

  test('filters to custom efforts when a user-defined effort exists', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoCatalog();
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
    await efforts.openNavigationIfPresent();
    await efforts.selectOrigin('Custom');

    await expect(efforts.effortRow('qa-custom-effort')).toBeVisible();
    await expect(efforts.effortRows()).toHaveCount(1);

    errors.expectClean();
  });

  test('shows recent workouts for the current effort on the detail route', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoDetail('burpee');
    await efforts.clearRecentResults();
    await efforts.seedRecentWorkoutForEffort({
      slug: 'burpee',
      label: 'Burpee',
      noteId: 'journal/2026-05-20',
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await efforts.waitForDetailLoaded();
    await efforts.openNavigationIfPresent();

    await expect(efforts.recentWorkoutItems()).toHaveCount(1);
    await efforts.recentWorkoutItems().first().evaluate((element: HTMLElement) => element.click());
    await expect(page).toHaveURL(/\/journal\/2026-05-20$/);

    errors.expectClean();
  });
});
