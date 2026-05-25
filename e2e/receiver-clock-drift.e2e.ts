/**
 * WOD-664 — Validate Clock Drift & Time Sync (Receiver RTT Testing)
 *
 * Browser-level proof that the Chromecast receiver:
 *  1. Responds correctly to rpc-clock-sync-request (echoes t1, adds t2)
 *  2. Applies the offset from rpc-clock-sync-result to getSenderClockTimeMs()
 *  3. Registers window.__chromecast_senderClockTimeMs for timer hooks
 *  4. getRuntimeNowMs() prefers sender clock, falls back safely
 *  5. Observed drift between sender and receiver matches calculated offset
 *
 * This test drives the ClockSyncValidation story, which instantiates the
 * real ChromecastProxyRuntime + MockTransport inside the browser and renders
 * the assertion data as JSON so Playwright can verify it.
 */

import { test, expect } from '@playwright/test';

const STORYBOOK_BASE = 'http://localhost:6006';

function storyUrl(storyId: string) {
  const params = new URLSearchParams({ id: storyId });
  return `${STORYBOOK_BASE}/iframe.html?${params.toString()}`;
}

test.describe('Receiver Clock Drift & Time Sync (WOD-664)', () => {
  test('clock sync protocol handles RTT handshake and applies offset', async ({ page }) => {
    await page.goto(storyUrl('testing-clocksyncvalidation--default'));
    await page.waitForLoadState('networkidle');

    const resultsEl = page.locator('[data-testid="clock-sync-results"]');
    await expect(resultsEl).toBeVisible({ timeout: 5000 });

    const text = await resultsEl.textContent();
    let results: Record<string, unknown>;
    try {
      results = JSON.parse(text ?? '{}');
    } catch {
      throw new Error(`Failed to parse clock-sync results. Raw text: ${text}`);
    }

    // ── 1. Receiver echoes request timestamp in rpc-clock-sync-response ──
    expect(
      results.requestTestPassed,
      'Receiver should echo requestTimestamp in rpc-clock-sync-response'
    ).toBe(true);

    expect(
      results.responseTimestampDeltaMs,
      'receiverTimestamp in response should be within 200 ms of local Date.now()'
    ).toBeLessThan(200);

    // ── 2. Offset from rpc-clock-sync-result is applied to sender clock ──
    expect(
      results.resultTestPassed,
      'getSenderClockTimeMs() should reflect the applied offset (±200 ms)'
    ).toBe(true);

    expect(results.appliedOffsetMs).toBe(5000);

    expect(
      Math.abs(results.senderTimeDeltaMs as number),
      'Sender time delta should be within 200 ms of expected'
    ).toBeLessThan(200);

    // ── 3. Global __chromecast_senderClockTimeMs is registered ──
    expect(
      results.globalRegistered,
      'window.__chromecast_senderClockTimeMs should be registered by receiver'
    ).toBe(true);

    expect(
      results.globalValueCorrect,
      'Global sender clock should return sender-adjusted time (±200 ms)'
    ).toBe(true);

    // ── 4. getRuntimeNowMs() prefers sender clock ──
    expect(
      results.usesSenderClock,
      'getRuntimeNowMs() must return the sender clock value when available'
    ).toBe(true);

    // ── 5. Fallback when sender clock is missing ──
    expect(
      results.fallbackWorks,
      'getRuntimeNowMs() must fall back to Date.now() when sender clock is absent'
    ).toBe(true);

    // ── 6. Fallback when sender clock throws ──
    expect(
      results.errorFallbackWorks,
      'getRuntimeNowMs() must fall back to Date.now() when sender clock throws'
    ).toBe(true);

    // ── 7. Drift simulation: observed sender-local delta ≈ offset ──
    expect(
      results.driftTestPassed,
      'Observed drift between sender and local should match applied offset (±200 ms)'
    ).toBe(true);

    expect(
      Math.abs(results.observedDriftMs as number),
      'Observed drift should be close to the 8000 ms offset'
    ).toBeGreaterThanOrEqual(7800);

    expect(
      Math.abs(results.observedDriftMs as number),
      'Observed drift should be close to the 8000 ms offset'
    ).toBeLessThanOrEqual(8200);
  });
});
