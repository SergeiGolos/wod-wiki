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
      await page.goto('/collections?categories=crossfit', { waitUntil: 'domcontentloaded' });

      await page.goto('/collections/crossfit-games-2020', { waitUntil: 'domcontentloaded' });
      await openSidebarIfNeeded(page, viewport.name);
      await expect(page.getByRole('button', { name: /^kettlebell$/i }).last()).toBeVisible();
      await page.getByRole('button', { name: /^crossfit$/i }).click();
      await expect(page).toHaveURL(/\/collections\?categories=crossfit$/);

      await page.getByRole('button', { name: /crossfit girls/i }).click();
      await expect(page).toHaveURL(/\/collections\/crossfit-girls$/);

      await page.locator('#collection-workouts').getByRole('button', { name: /^annie\b/i }).click();
      await expect(page).toHaveURL(/\/collections\/crossfit-girls\/annie$/);

      await openSidebarIfNeeded(page, viewport.name);
      await expect(page.getByRole('button', { name: /crossfit girls/i }).last()).toBeVisible();
      await expect(page.getByRole('button', { name: /^annie$/i }).last()).toBeVisible();
      await expect(page.getByRole('button', { name: /^annie$/i }).last()).toHaveClass(/bg-primary\/10/);
      await expect(page.getByRole('button', { name: /^fran$/i }).last()).toBeVisible();

      await page.getByRole('button', { name: /^fran$/i }).last().click();
      await expect(page).toHaveURL(/\/collections\/crossfit-girls\/fran$/);

      await openSidebarIfNeeded(page, viewport.name);
      await page.getByRole('button', { name: /crossfit girls/i }).last().click();
      await expect(page).toHaveURL(/\/collections\/crossfit-girls$/);

      await page.screenshot({
        path: testInfo.outputPath(`dead-click-collections-workout-${viewport.name}.png`),
        fullPage: true,
      });
    });

    test(`journal plan-a-workout slots open the selected date editor on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport.size);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const targetDate = localDateKey(tomorrow);

      // Future plan slots only render in plan mode (ADR unified-journal-with-plan-mode).
      await page.goto('/journal?mode=plan', { waitUntil: 'domcontentloaded' });

      // Plan mode renders a "Create journal entry" card per future date;
      // today carries "Start today's journal entry", so tomorrow is the
      // first "Create journal entry" card. The card opens the source palette
      // (Blank · Collection · History · Feed) — Blank creates immediately.
      await page.getByText('Create journal entry').first().click();
      await page.getByText('Blank', { exact: true }).first().click();

      await expect(page).toHaveURL(new RegExp(`/journal/${targetDate}(?:$|\\?)`));
      // The blank template (`# Journal Entry` + empty wod fence) is in the editor.
      await expect(page.locator('.cm-content[contenteditable="true"]').first()).toContainText('Journal Entry', { timeout: 10_000 });

      await page.screenshot({
        path: testInfo.outputPath(`dead-click-journal-plan-slot-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }
});
