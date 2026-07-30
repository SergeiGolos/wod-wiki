import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', size: { width: 1440, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

async function openSidebarIfNeeded(page: Parameters<typeof test>[0]['page'], viewportName: string) {
  if (viewportName === 'mobile') {
    await page.getByLabel('Open navigation').click();
  }
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test.describe('Live App Click Handler Navigation', () => {
  for (const viewport of viewports) {
    test(`collection workout cards navigate to the workout editor on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport.size);

      // Navigate directly to the collection detail page (the list route /collections
      // now redirects to /library per the Unified Content Library #813).
      await page.goto('/collections/crossfit-games-2020', { waitUntil: 'domcontentloaded' });

      // The collection detail page still renders its sidebar navigation.
      await openSidebarIfNeeded(page, viewport.name);
      await expect(page.getByRole('button', { name: /crossfit girls/i }).first()).toBeVisible();
      await page.getByRole('button', { name: /crossfit girls/i }).first().click();
      await expect(page).toHaveURL(/\/collections\/crossfit-girls$/);

      await page.locator('#collection-workouts').getByRole('button', { name: /^annie\b/i }).click();
      await expect(page).toHaveURL(/\/collections\/crossfit-girls\/annie$/);

      await openSidebarIfNeeded(page, viewport.name);
      await expect(page.getByRole('button', { name: /^fran$/i }).last()).toBeVisible();
      await page.getByRole('button', { name: /^fran$/i }).last().click();
      await expect(page).toHaveURL(/\/collections\/crossfit-girls\/fran$/);

      await page.screenshot({
        path: testInfo.outputPath(`dead-click-collections-workout-${viewport.name}.png`),
        fullPage: true,
      });
    });

    test(`journal date editor opens directly on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport.size);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDate = localDateKey(tomorrow);

      // Navigate directly to the journal date page (the list route /journal
      // now redirects to /library per #813).
      await page.goto(`/journal/${targetDate}`, { waitUntil: 'domcontentloaded' });

      // The date page loads its editor.
      await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 15_000 });

      await page.screenshot({
        path: testInfo.outputPath(`dead-click-journal-date-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }
});
