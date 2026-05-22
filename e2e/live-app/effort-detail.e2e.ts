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

function customEffortDocument(slug: string, label: string, body: string) {
  return `---
id: effort-user-${slug}
slug: ${slug}
label: "${label}"
aliases:
  - ${slug}
baseAttributes:
  met: 7.5
  discipline: strength
  intensityTier: moderate
registrySource: user
---
${body}
`;
}

test.describe('Effort detail — /effort/:slug', () => {
  test('renders bundled effort inside the aligned note shell', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoDetail('burpee');

    await expect(efforts.detailLabel()).toHaveText('Burpee');
    await expect(efforts.detailSource()).toContainText('Bundled');
    await expect(efforts.notebookEditor()).toContainText('slug: burpee');
    await expect(efforts.notebookEditor()).toContainText('label: Burpee');
    await expect(efforts.notebookEditor()).toContainText('burpees');
    await expect(efforts.detailAliases()).toHaveCount(0);
    await expect(efforts.detailAttributes()).toHaveCount(0);
    await expect(efforts.analyticsPlaceholder()).toHaveCount(0);

    errors.expectClean();
  });

  test('clone, save, edit, and delete a custom effort', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);
    const slug = `burpee-custom-${Date.now()}`;
    const updatedSlug = `${slug}-v2`;

    await efforts.gotoDetail('burpee');
    await efforts.cloneButton().click();
    await expect(efforts.notebookEditor()).toBeVisible();

    await efforts.replaceEditorDocument(
      customEffortDocument(slug, 'Burpee Custom Seed', 'Custom burpee notes for save flow.'),
    );
    await efforts.saveButton().click();

    await expect(page).toHaveURL(new RegExp(`/effort/${slug}$`));
    await expect(efforts.detailLabel()).toHaveText('Burpee Custom Seed');
    await expect(efforts.detailSource()).toContainText('Custom');
    await expect(efforts.editButton()).toBeVisible();

    await efforts.editButton().click();
    await expect(efforts.deleteButton()).toBeVisible();
    await efforts.replaceEditorDocument(
      customEffortDocument(updatedSlug, 'Burpee Custom Updated', 'Updated custom burpee notes.'),
    );
    await efforts.saveButton().click();

    await expect(page).toHaveURL(new RegExp(`/effort/${updatedSlug}$`));
    await expect(efforts.detailLabel()).toHaveText('Burpee Custom Updated');
    await expect(page.getByText('Updated custom burpee notes.')).toBeVisible();

    await efforts.editButton().click();
    await efforts.deleteButton().click();

    await expect(page).toHaveURL(/\/efforts$/);
    await expect(efforts.effortRow(updatedSlug)).toHaveCount(0);

    errors.expectClean();
  });

  test('cancel returns from edit mode without mutating the bundled effort', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoDetail('burpee');
    await efforts.cloneButton().click();
    await expect(efforts.notebookEditor()).toBeVisible();
    await efforts.cancelButton().click();

    await expect(efforts.detailLabel()).toHaveText('Burpee');
    await expect(efforts.cloneButton()).toBeVisible();
    await expect(efforts.notebookEditor()).toHaveCount(0);

    errors.expectClean();
  });

  test('renders a not-found state for unknown effort slugs', async ({ page }) => {
    const errors = attachErrorCapture(page);
    const efforts = new EffortsPage(page);

    await efforts.gotoDetail('nonexistent-effort-12345');

    await expect(efforts.detailNotFound()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to efforts' })).toBeVisible();

    errors.expectClean();
  });
});
