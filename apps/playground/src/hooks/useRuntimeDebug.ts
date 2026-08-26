/**
 * useRuntimeDebug — Public hook boundary for runtime debug utilities.
 *
 * Re-exports debug-specific runtime classes so that components in
 * `src/components/` never need to import directly from `src/runtime/`.
 *
 * Provides a `useRuntimeDebug` hook for debug panels that need formatted
 * runtime inspection data.
 */

import { useState } from 'react';

// ── Debug utilities ───────────────────────────────────────────────────────
export { RuntimeLogger } from '@bitcobblers/wod-wiki-engine';
export { RuntimeAdapter } from '@bitcobblers/wod-wiki-engine';
export type { MemoryEntry } from '@bitcobblers/wod-wiki-engine';

// ── Types ─────────────────────────────────────────────────────────────────
export type { IScriptRuntime } from '@bitcobblers/wod-wiki-engine';
export type { IRuntimeBlock } from '@bitcobblers/wod-wiki-engine';

// ── React hook ────────────────────────────────────────────────────────────

import { RuntimeLogger } from '@bitcobblers/wod-wiki-engine';

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
