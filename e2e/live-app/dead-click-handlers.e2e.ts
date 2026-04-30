import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', size: { width: 1440, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test.describe('Live App Click Handler Navigation', () => {
  for (const viewport of viewports) {
    test(`collection workout cards navigate to the workout editor on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport.size);
      await page.goto('/collections?categories=crossfit', { waitUntil: 'domcontentloaded' });

      await page.getByRole('button', { name: /crossfit girls/i }).click();
      await expect(page).toHaveURL(/\/collections\/crossfit-girls$/);

      await page.locator('#collection-workouts').getByRole('button', { name: /^fran\b/i }).click();
      await expect(page).toHaveURL(/\/workout\/crossfit-girls\/fran$/);
      await expect(page.getByText(/famous CrossFit benchmark workout/i).first()).toBeVisible();

      await page.screenshot({
        path: `e2e/screenshots/dead-click-collections-workout-${viewport.name}.png`,
        fullPage: true,
      });
    });

    test(`journal plan-a-workout slots open the selected date editor on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport.size);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDate = localDateKey(tomorrow);

      await page.goto('/journal', { waitUntil: 'domcontentloaded' });

      await page.getByTestId('journal-plan-workout').and(page.locator(`[data-date="${targetDate}"]`)).click();

      await expect(page).toHaveURL(new RegExp(`/journal/${targetDate}(?:$|\\?)`));
      await expect(page.getByText(/my workout/i).first()).toBeVisible();

      await page.screenshot({
        path: `e2e/screenshots/dead-click-journal-plan-slot-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }
});
