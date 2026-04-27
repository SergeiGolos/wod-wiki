import { test, expect } from '@playwright/test';

test.describe('Canvas editor source content', () => {
  test('does not show YAML frontmatter on syntax pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/syntax/basics', { waitUntil: 'domcontentloaded', timeout: 20_000 });

    const editors = page.locator('.cm-content[contenteditable="true"]');
    await expect(editors.first()).toBeAttached({ timeout: 15_000 });

    await expect
      .poll(async () => (await editors.allInnerTexts()).join('\n'), { timeout: 15_000 })
      .toContain('Pushups');
    const allEditorText = await editors.allInnerTexts();
    const joinedEditorText = allEditorText.join('\n');
    expect(joinedEditorText.trimStart().startsWith('---')).toBe(false);
    expect(joinedEditorText).not.toContain('search: hidden');
    expect(joinedEditorText).not.toContain('title: Just a Movement');

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: 'e2e/screenshots/canvas-editor-frontmatter.png', fullPage: true });
  });
});
