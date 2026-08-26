/**
 * useBrowserServices — Public hook boundary for browser-only service singletons.
 *
 * Re-exports singletons that require browser APIs (IndexedDB, Web Audio, etc.)
 * so that components in `src/components/` never need to import directly from
 * `src/services/`.
 *
 * ⚠️  This module eagerly initialises browser-specific singletons. Do not
 * import it in unit-test environments or server-side code that lacks browser
 * APIs. For pure, test-safe utilities (analytics, export/import helpers) use
 * `@/hooks/useWorkbenchServices` instead.
 */

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
