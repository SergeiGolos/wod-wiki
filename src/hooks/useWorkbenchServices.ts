/**
 * useWorkbenchServices — Public hook boundary for pure service utilities.
 *
 * Re-exports analytics helpers and file export/import utilities. All exports
 * here are pure functions with no browser-singleton dependencies, so this
 * module is safe to import in unit-test environments.
 *
 * For browser-only singletons (IndexedDB, AudioService, event bus instances)
 * use `@/hooks/useBrowserServices` instead.
 */

import { useMemo } from 'react';

// ── Analytics ─────────────────────────────────────────────────────────────
export { getAnalyticsFromRuntime, getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';
export type { SegmentWithMetadata } from '@/services/AnalyticsTransformer';

// ── Export / import ───────────────────────────────────────────────────────
export { exportAllNotes, exportNote, importFromZip, pickFile } from '@/services/ExportImportService';

// ── React hook ────────────────────────────────────────────────────────────

import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';
import type { IOutputStatement } from '@/core/models/OutputStatement';

export interface UseWorkbenchServicesReturn {
  /** Derive analytics from output statements */
  deriveAnalytics: (outputs: IOutputStatement[], startTime?: number) => ReturnType<typeof getAnalyticsFromLogs>;
}

/**
 * Hook that provides stable access to analytics derivation.
 *
 * @example
 * ```tsx
 * const { deriveAnalytics } = useWorkbenchServices();
 * const analytics = deriveAnalytics(outputStatements);
 * ```
 */
export function useWorkbenchServices(): UseWorkbenchServicesReturn {
  return useMemo(
    () => ({
      deriveAnalytics: (outputs: IOutputStatement[], startTime?: number) =>
        getAnalyticsFromLogs(outputs, startTime),
    }),
    [],
  );
}

