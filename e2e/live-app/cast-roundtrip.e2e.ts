/**
 * Cast Sender↔Receiver Round-Trip — behavioral e2e (WOD wayfinder #695)
 *
 * The only behavioral coverage of src/components/organisms/cast. Resolves the
 * ticket's core question: does a real session drive the receiver through its
 * state machine with matching workout data?
 *
 * Harness decision (made at stage open): LocalTabBackend dual-tab FIRST.
 * Rationale — dev builds default VITE_CAST_BACKEND to `local`, so the real
 * Cast button opens a genuine receiver popup (`/receiver-rpc.html?local=<id>`)
 * and exercises the real postMessage handshake + RPC transport. Playwright
 * captures the popup via context 'page' event; the popup shares the browser
 * context (same origin, window.opener intact) so the handshake is faithful.
 * Direct receiver-message injection is the documented fallback if the popup
 * handshake proves unworkable; it was not needed.
 *
 * Receiver state machine (playground/src/receiver-rpc.tsx):
 *   waiting-for-cast  →  (handshake → proxyRuntime set)  →  preview → active → review
 * The waiting screen renders `Wod.Wiki // <connectionStatus>`; once connected
 * the receiver mirrors the sender's workbench state (CONTEXT.md: Workbench
 * Session synced to the receiver via the cast RPC transport).
 */

import { test, expect, type Page } from '@playwright/test';
import { seedNote } from '../helpers/wodwikiDb';

// ── Runtime helpers (copied from runtime-execution.e2e.ts, #691) ────────────

async function startWorkoutWithTimer(page: Page, id: string, wodScript: string): Promise<void> {
  await seedNote(page, `playground/${id}`, `# ${id}\n\n${wodScript}`, {
    type: 'playground',
    title: id,
  });
  await page.goto(`/playground/${id}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await expect(page.locator('.cm-content[contenteditable="true"]').first()).toBeAttached({ timeout: 10_000 });
  await page.waitForTimeout(2_000);

  const play = page.getByRole('button', { name: 'Play' }).first();
  await expect(play).toBeVisible({ timeout: 10_000 });
  await play.evaluate((el) => (el as HTMLElement).click());

  await page.waitForURL(/\/(tracker|run)\//, { timeout: 10_000 });
  await expect(page.locator('button[title="Close"]').first()).toBeVisible({ timeout: 8_000 });
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe('Cast Sender↔Receiver Round-Trip (LocalTabBackend)', () => {
  const senderErrors: string[] = [];
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    senderErrors.length = 0;
    page.on('pageerror', (e) => senderErrors.push(e.message));
    page.on('dialog', (d) => { void d.accept(); });
    await page.addInitScript(() => {
      window.localStorage.setItem('wodwiki.profileInitialized.v1', 'true');
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5_000 });
    } catch {
      test.skip(true, 'Local dev server (localhost:5173) not running');
    }
  });

  test('cast handshake connects the receiver popup to the sender session', async ({ page, context }) => {
    await startWorkoutWithTimer(page, 'cast-e2e-connect', '```wod\nTimer: 1:00\n5 Burpees\n```');

    const castButton = page.getByRole('button', { name: 'Cast to TV' }).first();
    await expect(castButton).toBeVisible({ timeout: 10_000 });

    // Arm popup capture BEFORE the gesture that opens it.
    const popupPromise = context.waitForEvent('page', { timeout: 15_000 });
    await castButton.evaluate((el) => (el as HTMLElement).click());
    const popup = await popupPromise;

    // The popup is the receiver: /receiver-rpc.html?local=<sessionId>.
    await expect(popup).toHaveURL(/\/receiver-rpc\.html\?local=/, { timeout: 15_000 });

    // The receiver boots, completes the postMessage handshake, and mirrors the
    // sender's Workbench Session over the RPC transport. Proof of the live
    // round-trip: the receiver leaves the `Wod.Wiki //` waiting screen and
    // renders the active track panel (UP NEXT + START/NEXT/STOP + the timer),
    // mirroring the sender's session.
    await expect(popup.getByText(/up next/i).first()).toBeVisible({ timeout: 30_000 });

    // No unhandled errors on either side of the cast link.
    const receiverErrors: string[] = [];
    popup.on('pageerror', (e) => receiverErrors.push(e.message));
    await popup.waitForTimeout(1_000);
    expect(senderErrors).toEqual([]);
    expect(receiverErrors).toEqual([]);
  });

  test('sender block transitions mirror to the connected receiver', async ({ page, context }) => {
    await startWorkoutWithTimer(page, 'cast-e2e-mirror', '```wod\nTimer: 1:00\n5 Burpees\n```');

    const castButton = page.getByRole('button', { name: 'Cast to TV' }).first();
    await expect(castButton).toBeVisible({ timeout: 10_000 });
    const popupPromise = context.waitForEvent('page', { timeout: 15_000 });
    await castButton.evaluate((el) => (el as HTMLElement).click());
    const popup = await popupPromise;
    await expect(popup.getByText(/up next/i).first()).toBeVisible({ timeout: 30_000 });

    // Advancing the sender into its `Timer: 1:00` block must update the
    // receiver's mirrored timer — the receiver's state follows the sender.
    const next = page.locator('button[title="Next Block"]:visible').first();
    await expect(next).toBeVisible({ timeout: 10_000 });
    await next.click();
    await expect(popup.locator('body')).toContainText('1:00', { timeout: 20_000 });
  });
});
