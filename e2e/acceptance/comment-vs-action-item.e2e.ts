import { test, expect } from '@playwright/test';

/**
 * UX-05 acceptance: `// ...` comments must render visually distinct from
 * `[action items]` in the runner. Comments are passive coach annotations
 * (muted italic, no badge); action items remain interactive pill badges.
 *
 * Drives the `CommentVsActionItem` story in the Storybook MetricVisualizer
 * catalog so the distinction is asserted in a real browser.
 */

const STORY_IFRAME_URL =
  '/iframe.html?id=catalog-molecules-metrics-metricvisualizer--comment-vs-action-item&viewMode=story';
const STORY_LOAD_TIMEOUT_MS = 20000;

test.describe('UX-05: comment vs action item rendering', () => {
  test('comments render as muted italic annotations, action items render as pill badges', async ({
    page,
  }) => {
    await page.goto(STORY_IFRAME_URL, {
      waitUntil: 'networkidle',
      timeout: STORY_LOAD_TIMEOUT_MS,
    });

    // ── Comment node ─────────────────────────────────────────────────────
    const commentNodes = page.locator('[data-metric-type="comment"]');
    // The story renders the comment in three rows (comment / mixed contains
    // it once more); at minimum the dedicated row must exist.
    await expect(commentNodes.first()).toBeVisible();
    await expect(commentNodes.first()).toHaveText('Warm up first');

    // Comments must be styled as muted italic text — no emoji badge,
    // no border, no interactive `cursor-help` affordance.
    await expect(commentNodes.first()).toHaveClass(/italic/);
    await expect(commentNodes.first()).toHaveClass(/text-muted-foreground/);
    await expect(commentNodes.first()).not.toHaveClass(/border/);
    await expect(commentNodes.first()).not.toHaveClass(/cursor-help/);

    // The notepad emoji used for the generic `text` icon must not leak
    // into the comment slot (UX-05 root cause).
    const commentText = await commentNodes.first().textContent();
    expect(commentText ?? '').not.toContain('📝');

    // ── Action item node ─────────────────────────────────────────────────
    // Action items keep the standard interactive pill badge: inline-flex
    // with a border and the cursor-help affordance.
    const actionPill = page
      .locator('span.inline-flex.border', { hasText: 'Set up barbell' })
      .first();
    await expect(actionPill).toBeVisible();
    await expect(actionPill).toHaveClass(/cursor-help/);

    // The action pill is *not* the comment node — they use distinct
    // rendering paths.
    await expect(actionPill).not.toHaveAttribute('data-metric-type', 'comment');
  });
});
