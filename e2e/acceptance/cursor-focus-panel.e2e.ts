import { test, expect } from '@playwright/test';

const NOTE_EDITOR_STORY_IFRAME_URL =
  '/iframe.html?id=catalog-pages-planner--note-editor-default&viewMode=story';
const STORY_LOAD_TIMEOUT_MS = 20000;

test.describe('Cursor focus metric panel', () => {
  for (const { name, viewport } of [
    { name: 'desktop', viewport: { width: 1280, height: 900 } },
    { name: 'mobile', viewport: { width: 375, height: 812 } },
  ]) {
    test(`renders at the bottom of the editor viewport without inserting into document content on ${name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(NOTE_EDITOR_STORY_IFRAME_URL, {
        waitUntil: 'networkidle',
        timeout: STORY_LOAD_TIMEOUT_MS,
      });

      await page.locator('.cm-content').click();
      await page.getByText('Thrusters', { exact: true }).click();

      const bottomPanel = page.locator('.cm-panels-bottom .cm-wod-metric-panel');
      await expect(bottomPanel).toBeVisible();
      await expect(bottomPanel).toContainText('Exercise');
      await expect(bottomPanel).toContainText('Weight');
      await expect(bottomPanel).toContainText('Ctrl+. · edit');

      await expect(page.locator('.cm-content .cm-wod-metric-panel')).toHaveCount(0);

      await page.getByText('Fran', { exact: true }).click();

      const panelHost = page.locator('.cm-wod-metric-panel-host');
      await expect(panelHost).toBeHidden();
    });
  }
});
