import type { Page } from '@playwright/test';

declare global {
  interface Window {
    /** e2e fast-clock seam consumed by the RuntimeFactory singleton
     *  (src/hooks/useRuntimeFactory.ts). Production never sets it. */
    __wod_runtimeNowProvider?: () => { now(): Date; nowMs(): number };
    /** Display-layer "now" seam (src/runtime/browserRuntimeNow.ts). */
    __chromecast_senderClockTimeMs?: () => number;
  }
}

/**
 * installFastClock — accelerates the runtime and display clocks by
 * `speedFactor` (default 20×). Installs BOTH seams before app boot:
 *
 * - `window.__wod_runtimeNowProvider` → INowProvider consumed by the
 *   RuntimeFactory singleton (src/hooks/useRuntimeFactory.ts) and threaded
 *   into every ScriptRuntime it creates.
 * - `window.__chromecast_senderClockTimeMs` → `getRuntimeNowMs()` display
 *   seam (wallclock-panel, useTimerElapsed, useBlockMemory).
 *
 * Both derive from the same accelerated clock so runtime math and on-screen
 * elapsed stay in agreement. A 60s AMRAP completes in ~3s wall time at 20×.
 *
 * Must be called before the first `page.goto` of the app (addInitScript).
 */
export async function installFastClock(page: Page, speedFactor = 20): Promise<void> {
  await page.addInitScript((factor: number) => {
    const wallStart = Date.now();
    const initialMs = wallStart;
    const nowMs = () => initialMs + (Date.now() - wallStart) * factor;
    window.__wod_runtimeNowProvider = () => ({
      now: () => new Date(nowMs()),
      nowMs,
    });
    window.__chromecast_senderClockTimeMs = nowMs;
  }, speedFactor);
}
