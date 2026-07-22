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

      const panelAnchor = page.locator('.cm-wod-metric-panel-anchor');
      await expect(panelAnchor).toBeVisible();
      await expect(panelAnchor).toContainText('Exercise');
      await expect(panelAnchor).toContainText('Weight');
      await expect(panelAnchor).toContainText('Ctrl+. · edit');

      // The panel should be rendered only as the block widget anchor,
      // never duplicated inline inside the editable prose.
      await expect(page.locator('.cm-wod-metric-panel')).toHaveCount(1);
      await expect(page.locator('.cm-wod-metric-panel-anchor .cm-wod-metric-panel')).toHaveCount(1);

      await page.getByText('Fran', { exact: true }).click();

      await expect(panelAnchor).toBeHidden();
    });
  }
});
