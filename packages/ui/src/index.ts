/**
 * @bitcobblers/wod-wiki-ui — Interactive UI package for Whiteboard Language & WQL
 *
 * Exports:
 * - 15 State-free WQL analytics widgets consuming IR QueryResult shapes
 * - Dashboard orchestrator (DashboardView) and query hooks (useAnalyticsQueries)
 * - Injected QueryExecutor and Storage contracts (0 IndexedDB / browser storage coupling)
 * - WQL Omni-Composer and diagnostics
 * - CodeMirror editor extensions (@bitcobblers/wod-wiki-ui/extensions) and editorPreset
 * - CODEMIRROR_SINGLETON_DEPS constant for consumer dedupe
 * - Design tokens via `@bitcobblers/wod-wiki-ui/styles.css`
 */

// ── 1. Contracts & Dedupe Constant ────────────────────────────────────────────
export * from './contracts';

// ── 2. State-Free Analytics Widgets & Chart Utilities ─────────────────────────
export * from './widgets';

// ── 3. Query Blocks & Modals ──────────────────────────────────────────────────
export * from './blocks';

// ── 4. WQL Composer & Diagnostics ─────────────────────────────────────────────
export * from './composer';

// ── 5. Editor Extensions & Presets ────────────────────────────────────────────
export * from './extensions';

// ── 6. Utilities ──────────────────────────────────────────────────────────────
export * from './utils/cn';
export * from './utils/blockQueryPatcher';

// ── 7. Version Metadata ───────────────────────────────────────────────────────
export * from './version';
