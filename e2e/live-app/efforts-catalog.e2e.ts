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

test.describe('Efforts catalog — /efforts', () => {
  test('loads catalog chrome and shows bundled efforts', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoCatalog();

    await expect(efforts.catalogSearch()).toBeVisible();
    await expect(efforts.createCustomButton()).toBeVisible();
    await expect(efforts.effortRow('burpee')).toBeVisible();
    await expect(efforts.effortRow('rowing')).toBeVisible();
    expect(await efforts.effortRows().count()).toBeGreaterThan(10);

    errors.expectClean();
  });

  test('filters the catalog by search text', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoCatalog();
    await efforts.searchFor('burpee');

    await expect(efforts.effortRow('burpee')).toBeVisible();
    await expect(efforts.effortRows()).toHaveCount(1);

    await efforts.searchFor('');
    await expect(efforts.effortRow('rowing')).toBeVisible();

    errors.expectClean();
  });

  test('opens effort detail when a catalog row is clicked', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoCatalog();
    await efforts.clickEffortRow('burpee');

    await expect(page).toHaveURL(/\/effort\/burpee$/);
    await expect(efforts.detailLabel()).toHaveText('Burpee');

    errors.expectClean();
  });

  test('opens create-custom flow from the catalog CTA', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoCatalog();
    await efforts.createCustomButton().click();

    await expect(page).toHaveURL(/\/effort\/new\?mode=create$/);
    await expect(efforts.detailRoot()).toBeVisible();
    await expect(efforts.notebookEditor()).toBeVisible();
    await expect(efforts.saveButton()).toBeVisible();
    await expect(efforts.cancelButton()).toBeVisible();

    errors.expectClean();
  });
});
