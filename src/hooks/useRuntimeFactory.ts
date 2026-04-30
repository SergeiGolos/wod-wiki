/**
 * useRuntimeFactory — Public hook boundary for compiler and factory access.
 *
 * Re-exports the JIT compiler singleton and `RuntimeFactory` so that
 * components in `src/components/` never need to import directly from
 * `src/runtime/`.
 *
 * For lightweight parser-only access (parse text → IScript) use
 * `useRuntimeParser` from `@/hooks/useRuntimeParser` instead.
 */

import { useMemo } from 'react';

// ── Compiler / runtime factory exports ───────────────────────────────────
export { globalCompiler, globalParser } from '@/runtime/services/runtimeServices';
export { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
export type { IRuntimeFactory } from '@/runtime/compiler/RuntimeFactory';

// ── Singleton factory ─────────────────────────────────────────────────────

import { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
import { globalCompiler } from '@/runtime/services/runtimeServices';

/**
 * Shared RuntimeFactory singleton — avoids re-constructing the compiler on
 * every render.  Import this instead of `new RuntimeFactory(globalCompiler)`.
 */
export const runtimeFactory = new RuntimeFactory(globalCompiler);

// ── React hook ────────────────────────────────────────────────────────────

export interface UseRuntimeFactoryReturn {
  /** Shared RuntimeFactory instance */
  factory: RuntimeFactory;
}

/**
 * Hook that provides a stable factory reference for React components that
 * need to create runtime instances from WOD blocks.
 *
 * @example
 * ```tsx
 * const { factory } = useRuntimeFactory();
 * const runtime = factory.createRuntime(block);
 * ```
 */
export function useRuntimeFactory(): UseRuntimeFactoryReturn {
  return useMemo(() => ({ factory: runtimeFactory }), []);
}
