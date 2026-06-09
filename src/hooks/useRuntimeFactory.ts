/**
 * useRuntimeFactory — Public hook boundary for compiler and factory access.
 */

import { useMemo } from 'react';

// ── Compiler / runtime factory exports ───────────────────────────────────
export { globalCompiler, globalParser, createCompiler, PRODUCTION_STRATEGIES } from '@/runtime/services/runtimeServices';
export { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
export type { IRuntimeFactory } from '@/runtime/compiler/RuntimeFactory';

// ── Singleton factory ─────────────────────────────────────────────────────

import { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
import { createCompiler } from '@/runtime/services/runtimeServices';

/**
 * Shared RuntimeFactory singleton — built from the canonical compiler factory.
 */
export const runtimeFactory = new RuntimeFactory(createCompiler());

// ── React hook ────────────────────────────────────────────────────────────

export interface UseRuntimeFactoryReturn {
  /** Shared RuntimeFactory instance */
  factory: RuntimeFactory;
}

export function useRuntimeFactory(): UseRuntimeFactoryReturn {
  return useMemo(() => ({ factory: runtimeFactory }), []);
}
