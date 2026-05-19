import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', size: { width: 1440, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

test.describe('Widget edit behavior', () => {
  for (const viewport of viewports) {
    test.describe(`on ${viewport.name}`, () => {
      test.use({ viewport: viewport.size });

      test('enters edit mode via pencil button, saves, and persists changes', async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
            consoleErrors.push(msg.text());
          }
        });

        await page.goto('/playground', { waitUntil: 'domcontentloaded' });

        // Focus a widget block to reveal the edit button
        const widgetBlock = page.locator('[data-widget-section-id]').first();
        await widgetBlock.focus();

        const editButton = widgetBlock.locator('[aria-label="Edit widget"]');
        await expect(editButton).toBeVisible();
        await editButton.click();

        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        await expect(textarea).toBeVisible();

        // Edit the markdown
        await textarea.fill('{"title":"Updated"}');
        await widgetBlock.locator('[aria-label="Save widget"]').click();

        await expect(textarea).toBeHidden();
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).toBeVisible();

        // Reload and verify persistence
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).toContainText('Updated');
        expect(consoleErrors).toEqual([]);
      });

      test('auto-saves valid JSON on blur', async ({ page }) => {
        await page.goto('/playground', { waitUntil: 'domcontentloaded' });

        const widgetBlock = page.locator('[data-widget-section-id]').first();
        await widgetBlock.focus();

        await widgetBlock.locator('[aria-label="Edit widget"]').click();

        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        await textarea.fill('{"title":"BlurSaved"}');

        // Blur to an outside element
        await page.keyboard.press('Tab');
        await expect(textarea).toBeHidden();
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).toContainText('BlurSaved');
      });

      test('shows error inlay and undo on invalid JSON blur', async ({ page }) => {
        await page.goto('/playground', { waitUntil: 'domcontentloaded' });

        const widgetBlock = page.locator('[data-widget-section-id]').first();
        await widgetBlock.focus();

        await widgetBlock.locator('[aria-label="Edit widget"]').click();

        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        await textarea.fill('{"title":');

        await page.keyboard.press('Tab');

        await expect(widgetBlock.locator('[data-testid="widget-error-inlay"]')).toBeVisible();
        const undoButton = widgetBlock.locator('[aria-label="Undo changes"]');
        await expect(undoButton).toBeVisible();

        await undoButton.click();
        await expect(widgetBlock.locator('[data-testid="widget-error-inlay"]')).toBeHidden();
        await expect(textarea).toBeHidden();
      });

      test('keyboard flow: Enter to edit, Escape to discard, Ctrl+Enter to save', async ({ page }) => {
        await page.goto('/playground', { waitUntil: 'domcontentloaded' });

        const widgetBlock = page.locator('[data-widget-section-id]').first();
        await widgetBlock.focus();

        // Enter to edit
        await page.keyboard.press('Enter');
        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        await expect(textarea).toBeVisible();

        // Type something then Escape to discard
        await textarea.fill('{"title":"Discarded"}');
        await page.keyboard.press('Escape');
        await expect(textarea).toBeHidden();
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).not.toContainText('Discarded');

        // Enter again, then Ctrl+Enter to save
        await widgetBlock.focus();
        await page.keyboard.press('Enter');
        await expect(textarea).toBeVisible();
        await textarea.fill('{"title":"CtrlSaved"}');
        await page.keyboard.press('Control+Enter');
        await expect(textarea).toBeHidden();
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).toContainText('CtrlSaved');
      });

      test('undo button discards invalid edits and restores preview', async ({ page }) => {
        await page.goto('/playground', { waitUntil: 'domcontentloaded' });

        const widgetBlock = page.locator('[data-widget-section-id]').first();
        await widgetBlock.focus();

        await widgetBlock.locator('[aria-label="Edit widget"]').click();

        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        await textarea.fill('{"title":');
        await page.keyboard.press('Tab');

        await widgetBlock.locator('[aria-label="Undo changes"]').click();
        await expect(widgetBlock.locator('[data-testid="widget-error-inlay"]')).toBeHidden();
        await expect(textarea).toBeHidden();
      });
    });
  }
});
