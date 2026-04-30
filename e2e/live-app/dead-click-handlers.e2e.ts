import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', size: { width: 1440, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

test.describe('Live App Click Handler Navigation', () => {
  for (const viewport of viewports) {
    test(`collection workout cards navigate to the workout editor on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport.size);
      await page.goto('/collections', { waitUntil: 'domcontentloaded' });

      await page.getByRole('button', { name: /crossfit girls/i }).first().click();
      await expect(page).toHaveURL(/\/collections\/crossfit-girls$/);

      await page.getByRole('button', { name: /^fran\s+crossfit-girls$/i }).first().click();
      await expect(page).toHaveURL(/\/workout\/crossfit-girls\/fran$/);
      await expect(page.getByText(/famous CrossFit benchmark workout/i).first()).toBeVisible();

      await page.screenshot({
        path: `e2e/screenshots/dead-click-collections-workout-${viewport.name}.png`,
        fullPage: true,
      });
    });

    test(`journal plan-a-workout slots open the selected date editor on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport.size);
      await page.goto('/journal', { waitUntil: 'domcontentloaded' });

      await page.getByRole('button', { name: /plan a workout/i }).first().click();

      await expect(page).toHaveURL(/\/journal\/\d{4}-\d{2}-\d{2}(?:$|\?)/);
      await expect(page.getByText(/my workout/i).first()).toBeVisible();

      await page.screenshot({
        path: `e2e/screenshots/dead-click-journal-plan-slot-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }
});
