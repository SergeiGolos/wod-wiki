import { test, expect, type Page } from '@playwright/test';

/**
 * Dark-theme gate (journal-dark project): key playground routes boot with the
 * dark theme actually applied — html.dark plus real rendered content. Theme is
 * forced via the wod-wiki-playground-theme storage key (ThemeProvider reads it
 * on mount and toggles the class on documentElement).
 */

const ROUTES = ['/', '/journal', '/library', '/efforts', '/analytics/explorer', '/playground/hello-world'];

async function renderedContent(page: Page) {
  return (await page.locator('body').innerText()).trim().length;
}

for (const route of ROUTES) {
  test(`dark theme applies on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/, { timeout: 20_000 });
    await expect.poll(() => renderedContent(page), { timeout: 20_000 }).toBeGreaterThan(60);
  });
}
