/**
 * useRuntimeFactory — Compiler / runtime factory exports.
 *
 * The React hook (`useRuntimeFactory`) was removed per Finding 06 Step 5
 * (dead code cleanup) — 0 callers; consumers import the singleton directly.
 * The singleton + type remain because they're the canonical
 * "production runtime factory" entry point used by `Workbench.tsx`,
 * `runtimeTimerModel.ts`, and `RuntimeLifecycleProvider`.
 */
export { createCompiler, PRODUCTION_STRATEGIES } from '@bitcobblers/wod-wiki-engine';
export { RuntimeFactory } from '@bitcobblers/wod-wiki-engine';
export type { IRuntimeFactory } from '@bitcobblers/wod-wiki-engine';

import { RuntimeFactory } from '@bitcobblers/wod-wiki-engine';
import { createCompiler } from '@bitcobblers/wod-wiki-engine';
import type { INowProvider } from '@bitcobblers/wod-wiki-engine';
import { wallClockNow } from '@bitcobblers/wod-wiki-engine';

/**
 * e2e fast-clock hook (see e2e/utils/fastClock.ts): when the page installs
 * `window.__wod_runtimeNowProvider` before app boot, runtimes use the
 * accelerated provider instead of the wall clock. Production never sets it.
 */
declare global {
  interface Window {
    __wod_runtimeNowProvider?: () => INowProvider;
  }
}

const nowProvider: INowProvider =
  (typeof window !== 'undefined' ? window.__wod_runtimeNowProvider?.() : undefined) ??
  wallClockNow;

/**
 * Shared RuntimeFactory singleton — built from the canonical compiler factory.
 */
export const runtimeFactory = new RuntimeFactory(createCompiler(), nowProvider);
