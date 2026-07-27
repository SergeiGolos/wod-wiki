import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { seedNote, getNoteContentByRouteId } from '../helpers/wodwikiDb';

const viewports = [
  { name: 'desktop', size: { width: 1440, height: 900 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

const WIDGET_NOTE_ID = 'widget-edit';

/** Minimal valid `widget:attention` config; the widget requires headline, subtitle, and ≥1 pillar. */
function attentionConfig(headline: string): string {
  return JSON.stringify({
    headline,
    subtitle: 'Seeded attention widget for e2e.',
    pillars: [{ icon: '✍️', label: 'Markdown', description: 'Seed pillar.' }],
    actions: [],
  });
}

const WIDGET_NOTE = `# Widget Edit E2E\n\n\`\`\`widget:attention\n${attentionConfig('Widget Edit Seed')}\n\`\`\`\n`;

/**
 * Saving from inside the widget leaves the CM cursor inside the section,
 * which reveals the widget source instead of the preview. Click the heading
 * line to move the cursor out so the preview decoration re-renders.
 */
async function moveCursorOutOfWidget(page: Page): Promise<void> {
  await page.locator('.cm-content').getByText('Widget Edit E2E').first().click();
}

async function gotoWidgetNote(page: Page): Promise<void> {
  // seedNote overwrites the same id, so each test starts from the seed config.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Suppress the First-Note Wizard dialog — its backdrop intercepts pointer
  // events over the whole page.
  await page.evaluate(() => {
    window.localStorage.setItem('wodwiki.firstNoteDone.v1', 'true');
    window.localStorage.setItem('wodwiki.profileInitialized.v1', 'true');
  });
  await seedNote(page, `playground/${WIDGET_NOTE_ID}`, WIDGET_NOTE, {
    type: 'playground',
    title: WIDGET_NOTE_ID,
  });
  await page.goto(`/playground/${WIDGET_NOTE_ID}`, { waitUntil: 'domcontentloaded' });
}

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

        await gotoWidgetNote(page);

        // Focus a widget block to reveal the edit button
        const widgetBlock = page.locator('[data-widget-section-id]').first();
        // Focus the preview surface (the focusable element inside the widget;
        // the outer container has no tabindex) to reveal the edit button.
        await widgetBlock.locator('[data-testid="widget-preview-surface"]').focus();

        const editButton = widgetBlock.locator('[aria-label="Edit widget"]');
        await expect(editButton).toBeVisible();
        await editButton.click();

        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        await expect(textarea).toBeVisible();

        // Edit the markdown
        // Wait for edit-mode auto-focus (rAF) to settle — filling mid-race
        // appends instead of replacing.
        await expect(textarea).toBeFocused();
        await textarea.fill(attentionConfig('Updated'));
        await widgetBlock.locator('[aria-label="Save widget"]').click();
        await moveCursorOutOfWidget(page);

        await expect(textarea).toBeHidden();
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).toBeVisible();

        // Reload and verify persistence (poll IDB — the save is debounced)
        await expect
          .poll(() => getNoteContentByRouteId(page, `playground/${WIDGET_NOTE_ID}`), { timeout: 10_000 })
          .toContain('Updated');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).toContainText('Updated');
        expect(consoleErrors).toEqual([]);
      });

      test('auto-saves valid JSON on blur', async ({ page }) => {
        await gotoWidgetNote(page);

        const widgetBlock = page.locator('[data-widget-section-id]').first();
        // Focus the preview surface (the focusable element inside the widget;
        // the outer container has no tabindex) to reveal the edit button.
        await widgetBlock.locator('[data-testid="widget-preview-surface"]').focus();

        await widgetBlock.locator('[aria-label="Edit widget"]').click();

        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        // Wait for edit-mode auto-focus (rAF) to settle — filling mid-race
        // appends instead of replacing.
        await expect(textarea).toBeFocused();
        await textarea.fill(attentionConfig('BlurSaved'));
        await expect(textarea).toHaveValue(attentionConfig('BlurSaved'));

        // Blur via a real click outside the widget — CM's indentWithTab
        // keymap swallows Tab inside widget decorations.
        await moveCursorOutOfWidget(page);
        await expect(textarea).toBeHidden();
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).toContainText('BlurSaved');
      });

      test('shows error inlay and undo on invalid JSON blur', async ({ page }) => {
        await gotoWidgetNote(page);

        const widgetBlock = page.locator('[data-widget-section-id]').first();
        // Focus the preview surface (the focusable element inside the widget;
        // the outer container has no tabindex) to reveal the edit button.
        await widgetBlock.locator('[data-testid="widget-preview-surface"]').focus();

        await widgetBlock.locator('[aria-label="Edit widget"]').click();

        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        // Wait for edit-mode auto-focus (rAF) to settle — filling mid-race
        // appends instead of replacing.
        await expect(textarea).toBeFocused();
        await textarea.fill('{"title":');

        // Blur via a real click outside the widget — CM's indentWithTab
        // keymap swallows Tab inside widget decorations.
        await moveCursorOutOfWidget(page);

        await expect(widgetBlock.locator('[data-testid="widget-error-inlay"]')).toBeVisible();
        const undoButton = widgetBlock.locator('[aria-label="Undo changes"]');
        await expect(undoButton).toBeVisible();

        await undoButton.click();
        await expect(widgetBlock.locator('[data-testid="widget-error-inlay"]')).toBeHidden();
        await expect(textarea).toBeHidden();
      });

      test('keyboard flow: Enter to edit, Escape to discard, Ctrl+Enter to save', async ({ page }) => {
        await gotoWidgetNote(page);

        const widgetBlock = page.locator('[data-widget-section-id]').first();
        // Focus the preview surface (the focusable element inside the widget;
        // the outer container has no tabindex) to reveal the edit button.
        await widgetBlock.locator('[data-testid="widget-preview-surface"]').focus();

        // Enter to edit
        await page.keyboard.press('Enter');
        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        await expect(textarea).toBeVisible();

        // Type something then Escape to discard
        // Wait for edit-mode auto-focus (rAF) to settle — filling mid-race
        // appends instead of replacing.
        await expect(textarea).toBeFocused();
        await textarea.fill(attentionConfig('Discarded'));
        await page.keyboard.press('Escape');
        await expect(textarea).toBeHidden();
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).not.toContainText('Discarded');

        // Enter again, then Ctrl+Enter to save
        // Focus the preview surface (the focusable element inside the widget;
        // the outer container has no tabindex) to reveal the edit button.
        await widgetBlock.locator('[data-testid="widget-preview-surface"]').focus();
        await page.keyboard.press('Enter');
        await expect(textarea).toBeVisible();
        // Wait for edit-mode auto-focus (rAF) to settle — filling mid-race
        // appends instead of replacing.
        await expect(textarea).toBeFocused();
        await textarea.fill(attentionConfig('CtrlSaved'));
        await page.keyboard.press('Control+Enter');
        await moveCursorOutOfWidget(page);
        await expect(textarea).toBeHidden();
        await expect(widgetBlock.locator('[data-testid="widget-preview-surface"]')).toContainText('CtrlSaved');
      });

      test('undo button discards invalid edits and restores preview', async ({ page }) => {
        await gotoWidgetNote(page);

        const widgetBlock = page.locator('[data-widget-section-id]').first();
        // Focus the preview surface (the focusable element inside the widget;
        // the outer container has no tabindex) to reveal the edit button.
        await widgetBlock.locator('[data-testid="widget-preview-surface"]').focus();

        await widgetBlock.locator('[aria-label="Edit widget"]').click();

        const textarea = widgetBlock.locator('[data-testid="widget-markdown-editor"]');
        // Wait for edit-mode auto-focus (rAF) to settle — filling mid-race
        // appends instead of replacing.
        await expect(textarea).toBeFocused();
        await textarea.fill('{"title":');
        // Blur via a real click outside the widget — CM's indentWithTab
        // keymap swallows Tab inside widget decorations.
        await moveCursorOutOfWidget(page);

        await widgetBlock.locator('[aria-label="Undo changes"]').click();
        await expect(widgetBlock.locator('[data-testid="widget-error-inlay"]')).toBeHidden();
        await expect(textarea).toBeHidden();
      });
    });
  }
});
