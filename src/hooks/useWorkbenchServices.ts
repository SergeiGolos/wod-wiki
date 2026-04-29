/**
 * useWorkbenchServices — Public hook boundary for service layer access.
 *
 * Re-exports all service singletons, classes, and utility functions so
 * that components in `src/components/` never need to import directly from
 * `src/services/`.
 *
 * Provides a `useWorkbenchServices` hook for React components that need
 * access to persistence, file handling, or analytics operations.
 */

import { useMemo } from 'react';

// ── Database ──────────────────────────────────────────────────────────────
export { indexedDBService } from '@/services/db/IndexedDBService';

// ── File processing ───────────────────────────────────────────────────────
export { fileProcessor } from '@/services/attachments/FileProcessor';

// ── Content providers ─────────────────────────────────────────────────────
export { StaticContentProvider } from '@/services/content/StaticContentProvider';

// ── Audio ─────────────────────────────────────────────────────────────────
export { audioService } from '@/services/AudioService';

// ── Event bus ─────────────────────────────────────────────────────────────
export { workbenchEventBus, WorkbenchEvent } from '@/services/WorkbenchEventBus';
export type { NavigateToPayload, ScrollToBlockPayload, HighlightBlockPayload, StartWorkoutPayload } from '@/services/WorkbenchEventBus';

// ── Workout events ────────────────────────────────────────────────────────
export { workoutEventBus } from '@/services/WorkoutEventBus';
export type { WorkoutEvent, WorkoutEventSubscriber } from '@/services/WorkoutEventBus';

// ── Notebooks ─────────────────────────────────────────────────────────────
export { notebookService, NotebookService } from '@/services/NotebookService';

// ── Export / import ───────────────────────────────────────────────────────
export { exportAllNotes, exportNote, importFromZip, pickFile } from '@/services/ExportImportService';

// ── Analytics ─────────────────────────────────────────────────────────────
export { getAnalyticsFromRuntime, getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';
export type { SegmentWithMetadata } from '@/services/AnalyticsTransformer';

// ── React hook ────────────────────────────────────────────────────────────

import { indexedDBService } from '@/services/db/IndexedDBService';
import { fileProcessor } from '@/services/attachments/FileProcessor';
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';
import type { IOutputStatement } from '@/core/models/OutputStatement';

export interface UseWorkbenchServicesReturn {
  /** Direct access to the IndexedDB service */
  db: typeof indexedDBService;
  /** Direct access to the file processor */
  fileProcessor: typeof fileProcessor;
  /** Derive analytics from output statements */
  deriveAnalytics: (outputs: IOutputStatement[], startTime?: number) => ReturnType<typeof getAnalyticsFromLogs>;
}

/**
 * Hook that provides stable access to common workbench service operations.
 *
 * @example
 * ```tsx
 * const { db, deriveAnalytics } = useWorkbenchServices();
 * const notes = await db.getAllNotes();
 * ```
 */
export function useWorkbenchServices(): UseWorkbenchServicesReturn {
  return useMemo(
    () => ({
      db: indexedDBService,
      fileProcessor,
      deriveAnalytics: (outputs: IOutputStatement[], startTime?: number) =>
        getAnalyticsFromLogs(outputs, startTime),
    }),
    [],
  );
}

