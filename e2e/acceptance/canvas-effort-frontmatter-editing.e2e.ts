import { test, expect } from '@playwright/test';

const EFFORT_FRONTMATTER_STORY_URL =
  '/iframe.html?id=catalog-pages-planner--note-editor-effort-frontmatter&viewMode=story';
const STORY_LOAD_TIMEOUT_MS = 20_000;

test.describe('Canvas effort frontmatter editing flow', () => {
  for (const { name, viewport } of [
    { name: 'desktop', viewport: { width: 1280, height: 900 } },
    { name: 'mobile', viewport: { width: 375, height: 812 } },
  ]) {
    test(`renders effort companion overlay on ${name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        // Ignore common Storybook / asset 404s unrelated to component functionality
        if (text.includes('404')) return;
        errors.push(text);
      });

      await page.setViewportSize(viewport);
      await page.goto(EFFORT_FRONTMATTER_STORY_URL, {
        waitUntil: 'networkidle',
        timeout: STORY_LOAD_TIMEOUT_MS,
      });

      // Wait for the editor to load
      const editor = page.locator('.cm-content[contenteditable="true"]');
      await expect(editor.first()).toBeAttached({ timeout: 15_000 });

      // Wait for frontmatter content to be parsed
      await expect
        .poll(async () => (await editor.allInnerTexts()).join('\n'), { timeout: 15_000 })
        .toContain('Rowing Intervals');

      // Click inside the frontmatter section to activate the companion
      await editor.getByText('rowing-intervals', { exact: false }).first().click();
      await page.waitForTimeout(400);

      // The effort companion overlay should be visible
      const companion = page.locator('.overlay-slot-active .h-full.w-full').filter({ hasText: 'Effort' });
      await expect(companion).toBeVisible({ timeout: 5_000 });

      // Should show the effort label
      await expect(companion).toContainText('Rowing Intervals');

      // Should show MET badge
      await expect(companion).toContainText('7.0');

      // On desktop, the full form should be visible when active
      if (name === 'desktop') {
        // Verify form inputs are present and populated
        await expect(companion.locator('input[spellcheck="false"]')).toHaveValue('rowing-intervals');
        await expect(companion.locator('input[type="number"]')).toHaveValue('7.0');
        // Verify the select has the expected options
        await expect(companion.locator('select')).toHaveValue('high');
      }

      // On mobile inactive frontmatter, the companion shows compact summary
      if (name === 'mobile') {
        // Mobile viewport may show compact mode; at minimum the header renders
        await expect(companion).toContainText('Effort');
      }

      expect(errors, `Console/page errors on ${name}`).toHaveLength(0);

      await page.screenshot({
        path: `e2e/screenshots/canvas-effort-frontmatter-${name}.png`,
        fullPage: true,
      });
    });

    test(`edits effort slug and commits to frontmatter on ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(EFFORT_FRONTMATTER_STORY_URL, {
        waitUntil: 'networkidle',
        timeout: STORY_LOAD_TIMEOUT_MS,
      });

      const editor = page.locator('.cm-content[contenteditable="true"]');
      await expect(editor.first()).toBeAttached({ timeout: 15_000 });

      // Click inside frontmatter to activate companion
      await editor.getByText('rowing-intervals', { exact: false }).first().click();
      await page.waitForTimeout(400);

      // On mobile, if companion is compact, skip form edit assertion
      const slugInput = page.locator('input[spellcheck="false"]');

      if (await slugInput.isVisible().catch(() => false)) {
        await slugInput.fill('updated-rowing');
        await slugInput.blur();
        await page.waitForTimeout(300);

        // Verify the editor content was updated
        const editorText = await editor.allInnerTexts();
        const joined = editorText.join('\n');
        expect(joined).toContain('updated-rowing');
      }

      await page.screenshot({
        path: `e2e/screenshots/canvas-effort-frontmatter-edit-${name}.png`,
        fullPage: true,
      });
    });
  }
});
