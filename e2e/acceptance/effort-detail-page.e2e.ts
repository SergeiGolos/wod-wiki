/**
 * EffortDetailPage — E2E Acceptance Tests
 *
 * Archetype: ACCEPTANCE — targets stories/catalog/pages/EffortDetailPage
 *
 * Validates:
 *  - Storybook stories load without console errors
 *  - JournalPageShell layout: sticky header, title, actions, index sidebar
 *  - Bundled effort renders label, slug, MET, discipline, aliases, origin badge
 *  - High-intensity effort renders correctly
 *  - With modifiers story shows resolved tab with effective values
 *  - Clone action enters edit mode with NoteEditor visible
 *  - Mobile viewport renders without sticky header or sidebar
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

  test('index sidebar renders on 3xl viewport', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1080 });
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.bundled);

    await expect(detail.indexSidebar()).toBeVisible();
    await expect(detail.indexLink('Attributes')).toBeVisible();
    await expect(detail.indexLink('Aliases')).toBeVisible();
    await expect(detail.indexLink('Analytics')).toBeVisible();
  });

  test('index sidebar links scroll to sections', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1080 });
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.bundled);

    await detail.indexLink('Analytics').click();
    await page.waitForTimeout(400);

    const analytics = detail.analyticsCard();
    await expect(analytics).toBeVisible();
    const rect = await analytics.evaluate((el) => el.getBoundingClientRect());
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeLessThan(page.viewportSize()?.height ?? 1080);
  });

  test('with modifiers index includes resolved sections', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1080 });
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.withModifiers);

    await expect(detail.indexLink('Effective Resolution')).toBeVisible();
    await expect(detail.indexLink('Applied Modifiers')).toBeVisible();
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
    await expect(page.getByText('rowing', { exact: true }).first()).toBeVisible();
  });

  test('shows bundled origin badge', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.originBadge()).toContainText('Bundled');
  });

  test('shows MET and discipline in attributes card', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.attributesCard().getByText('MET', { exact: true })).toBeVisible();
    await expect(detail.attributesCard().getByText('7.0', { exact: true })).toBeVisible();
  });

  test('renders aliases card', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.aliasesCard()).toBeVisible();
    await expect(page.getByText('row', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('rower', { exact: true }).first()).toBeVisible();
  });

  test('shows analytics placeholder', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.analyticsCard()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
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

  test('shows high intensity badge', async ({ page }) => {
    await expect(page.getByText('High')).toBeVisible();
  });

  test('shows elevated MET in attributes card', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.attributesCard().getByText('MET', { exact: true })).toBeVisible();
    await expect(detail.attributesCard().getByText('12.0', { exact: true })).toBeVisible();
  });
});

// ─ With modifiers (resolved tab) ────────────────────────────────────────────

test.describe('EffortDetailPage — With Modifiers', () => {
  test.beforeEach(async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.withModifiers);
  });

  test('shows resolved and definition tabs', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.resolvedTab()).toBeVisible();
    await expect(detail.definitionTab()).toBeVisible();
  });

  test('shows effective resolution card', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.effectiveResolutionCard()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Effective Resolution' })).toBeVisible();
  });

  test('shows applied modifiers card', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.appliedModifiersCard()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Applied Modifiers' })).toBeVisible();
  });

  test('displays effective MET when modified', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.effectiveResolutionCard().getByText('Effective MET', { exact: true })).toBeVisible();
    await expect(detail.effectiveResolutionCard().getByText('7.0', { exact: true })).toBeVisible();
  });

  test('displays discipline factor', async ({ page }) => {
    await expect(page.getByText('Discipline Factor')).toBeVisible();
  });

  test('switching to definition tab shows attributes card', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.clickDefinitionTab();
    await expect(detail.attributesCard()).toBeVisible();
    await expect(detail.attributesCard().getByText('7.0', { exact: true })).toBeVisible();
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

  test('NoteEditor shows Save and Cancel buttons in edit mode', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.bundled);
    await detail.clickClone();
    await detail.waitForNoteEditor();

    await expect(detail.saveButton()).toBeVisible();
    await expect(detail.cancelButton()).toBeVisible();
  });

  test('cancel returns to read-only view', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await detail.gotoStory(STORIES.bundled);
    await detail.clickClone();
    await detail.waitForNoteEditor();

    await detail.cancelButton().click();
    await page.waitForTimeout(300);

    await expect(detail.noteEditor()).not.toBeVisible();
    await expect(detail.attributesCard()).toBeVisible();
    await expect(detail.titleHeading()).toContainText('Rowing');
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

  test('content cards are visible on mobile', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.attributesCard()).toBeVisible();
    await expect(detail.aliasesCard()).toBeVisible();
  });

  test('sticky header is hidden on mobile', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.titleHeading()).not.toBeVisible();
    await expect(detail.actionsBar()).not.toBeVisible();
  });

  test('index sidebar is hidden on mobile', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.indexSidebar()).not.toBeVisible();
  });

  test('clone button is not visible on mobile', async ({ page }) => {
    const detail = new EffortDetailPage(page);
    await expect(detail.cloneButton()).not.toBeVisible();
  });
});
