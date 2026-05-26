import { test } from '@playwright/test';

const STORYBOOK_BASE = 'http://localhost:6006';
function storyUrl(storyId: string) {
  const params = new URLSearchParams({ id: storyId });
  return `${STORYBOOK_BASE}/iframe.html?${params.toString()}`;
}

test('debug spatial nav story', async ({ page }) => {
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto(storyUrl('testing-spatialnavigationvalidation--default'), { timeout: 15000 });
  
  // Wait for the actual story content, not the skeleton
  const el = page.locator('[data-testid="preview-block-0"]');
  await el.waitFor({ state: 'visible', timeout: 10000 });
  
  const attr = await el.getAttribute('data-nav-focused');
  console.log('data-nav-focused:', JSON.stringify(attr));
  
  const focusedId = await page.locator('[data-testid="spatial-nav-focused-id"]').textContent();
  console.log('focusedId:', JSON.stringify(focusedId));
});
