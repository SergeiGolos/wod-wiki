import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', size: { width: 1440, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

test.describe('Playground widget block previews', () => {
  for (const viewport of viewports) {
    test(`replace widget fences with registered React widgets on ${viewport.name}`, async ({ page }) => {
      const lifecycleWarnings: string[] = [];
      page.on('console', (message) => {
        const text = message.text();
        if (text.includes('flushSync was called from inside a lifecycle method')) {
          lifecycleWarnings.push(text);
        }
      });

      await page.setViewportSize(viewport.size);
      await page.goto('/playground', { waitUntil: 'domcontentloaded' });

      const widget = page.locator('.cm-widget-block-preview').first();
      await expect(widget).toBeVisible();
      await expect(widget).toContainText('Ready to try it?');
      await expect(page.locator('.cm-editor')).not.toContainText('widget:playground-run-tip');
      expect(lifecycleWarnings).toHaveLength(0);
    });
  }
});