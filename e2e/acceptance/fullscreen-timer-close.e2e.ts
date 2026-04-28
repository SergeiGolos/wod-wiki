/**
 * UX-01 — Close button dismisses the runner from the Ready-to-Start state.
 *
 * Issue: The Close (X) button in the FullscreenTimer overlay was perceived
 * as non-functional in the Ready-to-Start state because `handleClose`
 * deferred `onClose` by 100ms for hypothetical animations. This test
 * exercises the Storybook FullscreenTimer harness (autoStart=false → Ready
 * state) and asserts that clicking the Close button dismisses the overlay
 * promptly.
 */

import { test, expect } from '@playwright/test';

const STORY_URL =
  '/iframe.html?id=catalog-organisms-fullscreentimer--simple-timer&viewMode=story';
const STORY_LOAD_TIMEOUT_MS = 20000;

test.describe('FullscreenTimer — Close button (Ready to Start)', () => {
  test('dismisses the runner overlay when Close is clicked in the Ready state', async ({ page }) => {
    await page.goto(STORY_URL, { waitUntil: 'networkidle', timeout: STORY_LOAD_TIMEOUT_MS });

    // Launch the FullscreenTimer overlay from the harness.
    const launchButton = page.getByRole('button', { name: /^Open\b/i });
    await expect(launchButton).toBeVisible();
    await launchButton.click();

    // Overlay should be visible with the Ready-to-Start label.
    await expect(page.getByText('Ready to Start')).toBeVisible();

    // The Close (X) button is the floating button at the top-right of the
    // FocusedDialog. Identify it by its `title="Close"` attribute.
    const closeButton = page.locator('button[title="Close"]').first();
    await expect(closeButton).toBeVisible();

    await closeButton.click();

    // The overlay should be dismissed promptly (within a single React tick).
    // A previous bug made the dismiss feel unresponsive by deferring the
    // close via a 100ms setTimeout. Use a short timeout to guard against
    // reintroduction of any long synthetic delay between click and unmount.
    await expect(page.getByText('Ready to Start')).toBeHidden({ timeout: 250 });
    await expect(launchButton).toBeVisible();
  });
});
