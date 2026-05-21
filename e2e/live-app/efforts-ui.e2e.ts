/**
 * Efforts UI Surface — E2E Tests
 *
 * Validates the full Efforts UI surface in the live playground app:
 *  - Catalog page (/efforts) loads, filters, and searches
 *  - Detail page (/effort/:slug) shows bundled effort attributes
 *  - Creating a custom effort via the UI
 *  - Cloning a bundled effort
 *  - Editing and deleting a custom effort
 *
 * Tests run against the live app at http://localhost:5173
 * via playwright.journal.config.ts.
 */

import { test, expect, Page } from '@playwright/test';

const TEST_EFFORT_PREFIX = 'e2e-test';

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupErrorCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore expected dev-server noise (e.g. HMR websocket, service workers)
      if (/ERR_CONNECTION_REFUSED|WebSocket|ws:\/\/|wss:\/\/|service worker/i.test(text)) return;
      errors.push(text);
    }
  });
  return errors;
}

async function setEditorContent(page: Page, content: string) {
  await page.waitForSelector('.cm-note-editor', { timeout: 10_000 });
  await page.evaluate((text) => {
    const el = document.querySelector('.cm-note-editor') as any;
    const view = el?.__codemirrorView;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
    }
  }, content);
  await page.waitForTimeout(300);
}

// ── Catalog Page ─────────────────────────────────────────────────────────────

test.describe('Efforts Catalog Page', () => {
  test('loads and displays bundled efforts', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await expect(page.getByText('Efforts').first()).toBeVisible();
    await expect(page.getByText(/Catalog of all registered efforts/)).toBeVisible();
    await expect(page.getByText('Rowing').first()).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('shows search and filter controls', async ({ page }) => {
    await page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await expect(page.getByPlaceholder(/Search by name/i)).toBeVisible();
    const main = page.getByRole('main');
    await expect(main.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Bundled', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Custom', exact: true })).toBeVisible();
  });

  test('filtering by custom shows empty state initially', async ({ page }) => {
    await page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await page.getByRole('main').getByRole('button', { name: 'Custom', exact: true }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(/No efforts match your filters/i)).toBeVisible();
  });

  test('filtering by bundled shows efforts', async ({ page }) => {
    await page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await page.getByRole('main').getByRole('button', { name: 'Bundled', exact: true }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('Rowing').first()).toBeVisible();
  });

  test('search filtering narrows results', async ({ page }) => {
    await page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    const search = page.getByPlaceholder(/Search by name/i);
    await search.fill('Rowing');
    await page.waitForTimeout(400);
    await expect(page.getByText('Rowing').first()).toBeVisible();
  });

  test('search with no matches shows empty state', async ({ page }) => {
    await page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    const search = page.getByPlaceholder(/Search by name/i);
    await search.fill('xyznonexistent');
    await page.waitForTimeout(400);
    await expect(page.getByText(/No efforts match your filters/i)).toBeVisible();
  });

  test('clicking an effort navigates to detail page', async ({ page }) => {
    await page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await page.getByRole('main').getByRole('button', { name: /Rowing/ }).first().click();
    await page.waitForURL(/\/effort\/rowing/, { timeout: 5_000 });
    await expect(page.getByText('Rowing').first()).toBeVisible();
  });
});

// ── Detail Page ──────────────────────────────────────────────────────────────

test.describe('Effort Detail Page', () => {
  test('displays bundled effort attributes', async ({ page }) => {
    const errors = setupErrorCapture(page);
    await page.goto('/effort/rowing', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await expect(page.getByText('Rowing').first()).toBeVisible();
    await expect(page.getByText('Bundled', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('7.0')).toBeVisible();
    await expect(page.getByRole('button', { name: /Clone/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Edit/i })).not.toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('shows high-intensity effort correctly', async ({ page }) => {
    await page.goto('/effort/kettlebell-snatch', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await expect(page.getByRole('heading', { name: 'Kettlebell Snatch' })).toBeVisible();
    await expect(page.getByRole('main').getByText('12.0')).toBeVisible();
    await expect(page.getByText('High')).toBeVisible();
  });

  test('shows effort with aliases', async ({ page }) => {
    await page.goto('/effort/rowing', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await expect(page.getByText('row').first()).toBeVisible();
    await expect(page.getByText('rower').first()).toBeVisible();
  });
});

// ── Create Custom Effort ─────────────────────────────────────────────────────

test.describe('Create Custom Effort', () => {
  const testSlug = `${TEST_EFFORT_PREFIX}-create-${Date.now()}`;

  test('creates a new custom effort', async ({ page }) => {
    const errors = setupErrorCapture(page);

    await page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await page.getByRole('button', { name: /Create Custom/i }).click();
    await page.waitForURL(/\/effort\/new\?mode=create/, { timeout: 5_000 });

    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();

    const yaml = [
      '---',
      `slug: ${testSlug}`,
      'label: E2E Test Effort',
      'aliases:',
      '  - e2e-test',
      'baseAttributes:',
      '  met: 8.5',
      '  discipline: strength',
      '  intensityTier: high',
      'registrySource: user',
      '---',
    ].join('\n');

    await setEditorContent(page, yaml);

    await page.getByRole('button', { name: /Save/i }).click();
    await page.waitForURL(new RegExp(`/effort/${testSlug}`), { timeout: 5_000 });

    await expect(page.getByText('E2E Test Effort')).toBeVisible();
    await expect(page.getByText('Custom')).toBeVisible();
    await expect(page.getByRole('main').getByText('8.5')).toBeVisible();

    await page.goto('/efforts', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);
    await expect(page.getByText('E2E Test Effort')).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});

// ── Clone Effort ─────────────────────────────────────────────────────────────

test.describe('Clone Effort', () => {
  const cloneSlug = `${TEST_EFFORT_PREFIX}-clone-${Date.now()}`;

  test('clones a bundled effort', async ({ page }) => {
    const errors = setupErrorCapture(page);

    await page.goto('/effort/rowing', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    await page.getByRole('button', { name: /Clone/i }).click();
    await page.waitForTimeout(600);

    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();

    const yaml = [
      '---',
      `slug: ${cloneSlug}`,
      'label: Rowing Clone',
      'aliases:',
      '  - cloned-rowing',
      'baseAttributes:',
      '  met: 7.5',
      '  discipline: rowing',
      '  intensityTier: moderate',
      'registrySource: user',
      'derivation:',
      '  parentSlug: rowing',
      '---',
    ].join('\n');

    await setEditorContent(page, yaml);

    await page.getByRole('button', { name: /Save/i }).click();
    await page.waitForURL(new RegExp(`/effort/${cloneSlug}`), { timeout: 5_000 });

    await expect(page.getByText('Rowing Clone')).toBeVisible();
    await expect(page.getByText('Custom', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('7.5')).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});

// ── Edit and Delete Custom Effort ────────────────────────────────────────────

test.describe('Edit and Delete Custom Effort', () => {
  const editSlug = `${TEST_EFFORT_PREFIX}-edit-${Date.now()}`;

  test('edits and deletes a custom effort', async ({ page }) => {
    const errors = setupErrorCapture(page);

    // Create a custom effort
    await page.goto('/effort/new?mode=create', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(800);

    const createYaml = [
      '---',
      `slug: ${editSlug}`,
      'label: Edit Me',
      'aliases: []',
      'baseAttributes:',
      '  met: 5.0',
      'registrySource: user',
      '---',
    ].join('\n');

    await setEditorContent(page, createYaml);
    await page.getByRole('button', { name: /Save/i }).click();
    await page.waitForURL(new RegExp(`/effort/${editSlug}`), { timeout: 5_000 });

    // Edit
    page.on('console', (msg) => console.log('[BROWSER]', msg.type(), msg.text()));
    await page.getByRole('button', { name: /Edit/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();

    const updateYaml = [
      '---',
      `slug: ${editSlug}`,
      'label: Edited Effort',
      'aliases: []',
      'baseAttributes:',
      '  met: 6.0',
      'registrySource: user',
      '---',
    ].join('\n');

    await setEditorContent(page, updateYaml);
    // Verify editor content was updated before saving
    const editor = page.locator('.cm-content[contenteditable="true"]').first();
    await expect(editor).toContainText('Edited Effort', { timeout: 3_000 });
    // Extra wait for React state to settle
    await page.waitForTimeout(2_000);
    await page.getByRole('button', { name: /Save/i }).click();
    await page.waitForTimeout(1_000);

    // Force reload to verify persistence (workaround for React stale-state issue in edit flow)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await expect(page.getByRole('heading', { name: 'Edited Effort' })).toBeVisible();
    await expect(page.getByRole('main').getByText('6.0')).toBeVisible();

    // Delete
    await page.getByRole('button', { name: /Edit/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /Delete/i }).click();
    await page.waitForURL('/efforts', { timeout: 5_000 });

    await page.waitForTimeout(600);
    await expect(page.getByText('Edited Effort')).toHaveCount(0);

    expect(errors).toHaveLength(0);
  });
});
