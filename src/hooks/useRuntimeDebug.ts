/**
 * useRuntimeDebug — Public hook boundary for runtime debug utilities.
 *
 * Re-exports debug-specific runtime classes so that components in
 * `src/components/` never need to import directly from `src/runtime/`.
 *
 * Provides a `useRuntimeDebug` hook for debug panels that need formatted
 * runtime inspection data.
 */

import { useState, useEffect } from 'react';

// ── Debug utilities ───────────────────────────────────────────────────────
export { RuntimeLogger } from '@/runtime/RuntimeLogger';
export { RuntimeAdapter } from '@/runtime/adapters/RuntimeAdapter';
export type { MemoryEntry } from '@/runtime/types/executionSnapshot';

// ── Types ─────────────────────────────────────────────────────────────────
export type { IScriptRuntime } from '@/runtime/contracts/IScriptRuntime';
export type { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';

// ── React hook ────────────────────────────────────────────────────────────

import { RuntimeLogger } from '@/runtime/RuntimeLogger';

export interface UseRuntimeDebugReturn {
  /** Whether debug mode logging is currently enabled */
  isLoggingEnabled: boolean;
  /** Enable runtime logging */
  enableLogging: () => void;
  /** Disable runtime logging */
  disableLogging: () => void;
}

/**
 * Hook that exposes runtime debug controls.
 *
 * @example
 * ```tsx
 * const { isLoggingEnabled, enableLogging } = useRuntimeDebug();
 * ```
 */
export function useRuntimeDebug(): UseRuntimeDebugReturn {
  const [isLoggingEnabled, setIsLoggingEnabled] = useState(
    () => RuntimeLogger.enabled,
  );

  useEffect(() => {
    // Keep local state in sync if logging changes externally
    setIsLoggingEnabled(RuntimeLogger.enabled);
  }, []);

  const enableLogging = () => {
    RuntimeLogger.enable();
    setIsLoggingEnabled(true);
  };

  const disableLogging = () => {
    RuntimeLogger.disable();
    setIsLoggingEnabled(false);
  };

  return { isLoggingEnabled, enableLogging, disableLogging };
}
