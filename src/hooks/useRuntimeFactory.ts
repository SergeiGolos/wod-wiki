/**
 * useRuntimeFactory — Compiler / runtime factory exports.
 *
 * The React hook (`useRuntimeFactory`) was removed per Finding 06 Step 5
 * (dead code cleanup) — 0 callers; consumers import the singleton directly.
 * The singleton + type remain because they're the canonical
 * "production runtime factory" entry point used by `Workbench.tsx`,
 * `runtimeTimerModel.ts`, and `RuntimeLifecycleProvider`.
 */

export { createCompiler, PRODUCTION_STRATEGIES } from '@/runtime/services/runtimeServices';
export { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
export type { IRuntimeFactory } from '@/runtime/compiler/RuntimeFactory';

import { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
import { createCompiler } from '@/runtime/services/runtimeServices';

/**
 * Shared RuntimeFactory singleton — built from the canonical compiler factory.
 */
export const runtimeFactory = new RuntimeFactory(createCompiler());
