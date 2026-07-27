/**
 * EffortDetailPage — E2E Acceptance Tests
 *
 * Archetype: ACCEPTANCE — targets stories/catalog/pages/EffortDetailPage
 *
 * Validates the note-based EffortDetailPage rendered by JournalPageShell:
 *  - Storybook stories load without console errors
 *  - Sticky header shows title, origin badge, and actions
 *  - NoteEditor displays the YAML effort document
 *  - Bundled effort is read-only until cloned
 *  - Show Resolved toggle reveals the inline effective-resolution widget
 *  - Mobile viewport hides the sticky header and index sidebar
 */

import { test, expect, Page } from '@playwright/test';
import { EffortDetailPage } from '../pages/EffortDetailPage';

// ─ Story IDs ─────────────────────────────────────────────────────────────────

const STORIES = {
  bundled: 'catalog-pages-effortdetailpage--bundled-effort',
  highIntensity: 'catalog-pages-effortdetailpage--high-intensity-effort',
  withModifiers: 'catalog-pages-effortdetailpage--with-modifiers',
  mobile: 'catalog-pages-effortdetailpage--mobile',
};

// ─ Shared setup ──────────────────────────────────────────────────────────────

function setupErrorCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

// ─ Smoke tests — all stories render ──────────────────────────────────────────

test.describe('EffortDetailPage — Smoke', () => {
  for (const [name, storyId] of Object.entries(STORIES)) {
    test(`${name}: story loads without errors`, async ({ page }) => {
      const errors = setupErrorCapture(page);
      const detail = new EffortDetailPage(page);
      await detail.gotoStory(storyId);
      expect(errors, `Console/page errors in ${name} story`).toHaveLength(0);
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  }
});

// ─ JournalPageShell Layout ───────────────────────────────────────────────────

test.describe('EffortDetailPage — JournalPageShell Layout', () => {
  test('sticky header shows title and actions on desktop', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.bundled);

    await expect(detail.titleHeading()).toContainText('Rowing');
    await expect(detail.actionsBar()).toBeVisible();
    await expect(detail.cloneButton()).toBeVisible();
    await expect(detail.originBadge()).toContainText('Bundled');
    await expect(detail.editButton()).not.toBeVisible();
  });

  test('index sidebar is not rendered when effort has no headings', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1080 });
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.bundled);

    await expect(detail.indexSidebar()).toHaveCount(0);
  });

  test('main editor renders the bundled effort content', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1080 });
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.bundled);

    await expect(detail.editorContent()).toBeVisible();
    await expect(detail.editorContent()).toContainText('label: Rowing');
    await expect(detail.editorContent()).toContainText('slug: rowing');
    await expect(detail.editorContent()).toContainText('met: 7');
  });

  test('with modifiers story shows the resolved toggle and widget', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1080 });
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.withModifiers);

    await expect(detail.showResolvedButton()).toBeVisible();
    await detail.clickShowResolved();
    await expect(detail.resolvedWidget()).toBeVisible();
    await expect(detail.resolvedWidget()).toContainText('Effective MET');
    await expect(detail.resolvedWidget()).toContainText('Discipline Factor');
  });
});

// ─ Bundled effort ───────────────────────────────────────────────────────────

test.describe('EffortDetailPage — Bundled Effort', () => {
  test.beforeEach(async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.bundled);
  });

  test('displays effort label and slug', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.titleHeading()).toContainText('Rowing');
    await expect(detail.editorContent()).toContainText('slug: rowing');
  });

  test('shows bundled origin badge', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.originBadge()).toContainText('Bundled');
  });

  test('shows MET and discipline in YAML document', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.editorContent()).toContainText('met: 7');
    await expect(detail.editorContent()).toContainText('discipline: rowing');
  });

  test('renders aliases in YAML document', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.editorContent()).toContainText('aliases:');
    await expect(detail.editorContent()).toContainText('row');
    await expect(detail.editorContent()).toContainText('rower');
  });

  test('clone button is visible for bundled efforts', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.cloneButton()).toBeVisible();
  });

  test('edit button is hidden for bundled efforts', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.editButton()).not.toBeVisible();
  });
});

// ─ High-intensity effort ────────────────────────────────────────────────────

test.describe('EffortDetailPage — High Intensity', () => {
  test.beforeEach(async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.highIntensity);
  });

  test('displays effort label in header', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.titleHeading()).toContainText('Kettlebell Snatch');
  });

  test('shows high intensity tier in YAML document', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.editorContent()).toContainText('intensityTier: high');
  });

  test('shows elevated MET in YAML document', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.editorContent()).toContainText('met: 12');
  });
});

// ─ With modifiers (resolved tab) ────────────────────────────────────────────

test.describe('EffortDetailPage — With Modifiers', () => {
  test.beforeEach(async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.withModifiers);
  });

  test('shows resolved toggle', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.showResolvedButton()).toBeVisible();
  });

  test('shows effective resolution widget', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.clickShowResolved();
    await expect(detail.resolvedWidget()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Effective Resolution' })).toBeVisible();
  });

  test('displays effective MET', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.clickShowResolved();
    await expect(detail.resolvedWidget().getByText('Effective MET', { exact: true })).toBeVisible();
    await expect(detail.resolvedWidget().getByText('7.0', { exact: true })).toBeVisible();
  });

  test('displays discipline factor', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.clickShowResolved();
    await expect(detail.resolvedWidget().getByText('Discipline Factor')).toBeVisible();
  });

  test('hiding resolved widget restores the editor view', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.clickShowResolved();
    await expect(detail.resolvedWidget()).toBeVisible();

    await detail.clickHideResolved();
    await expect(detail.resolvedWidget()).not.toBeVisible();
    await expect(detail.editorContent()).toContainText('met: 7');
  });
});

// ─ NoteEditor (edit mode via Clone) ─────────────────────────────────────────

test.describe('EffortDetailPage — NoteEditor', () => {
  test('clone enters edit mode with NoteEditor visible', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.bundled);
    await detail.clickClone();
    await detail.waitForNoteEditor();

    await expect(detail.noteEditor()).toBeVisible();
    await expect(detail.editorContent()).toContainText('Rowing (Custom)');
    await expect(detail.editorContent()).toContainText('rowing-custom');
  });
});

// ─ Mobile viewport ───────────────────────────────────────────────────────────

test.describe('EffortDetailPage — Mobile', () => {
  test.beforeEach(async ({ page }) => {
    // Explicitly set Playwright viewport so Tailwind responsive classes apply
    await page.setViewportSize({ width: 375, height: 667 });
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.mobile);
  });

  test('editor content is visible on mobile', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.editorContent()).toBeVisible();
    await expect(detail.editorContent()).toContainText('met: 7');
  });

  test('sticky header is hidden on mobile', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.titleHeading()).not.toBeVisible();
    await expect(detail.actionsBar()).not.toBeVisible();
  });

  test('index sidebar is hidden on mobile', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.indexSidebar()).toHaveCount(0);
  });

  test('clone button is not visible on mobile', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.cloneButton()).not.toBeVisible();
  });
});
