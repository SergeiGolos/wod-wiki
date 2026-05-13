/**
 * Central source of truth for data-testid attributes.
 *
 * Rule: every assertable or interactive node in a component must use one of
 * these IDs. E2E tests and Storybook play() functions import from this shared
 * contract — never from ad-hoc string literals.
 *
 * Naming convention: SCREAMING_SNAKE_CASE keys → kebab-case values.
 */
export const TEST_IDS = {
  // ── Workbench shell ────────────────────────────────────────────────────────
  WORKBENCH_ROOT: 'workbench-root',
  WORKBENCH_HEADER: 'workbench-header',
  WORKBENCH_RESET_BUTTON: 'workbench-reset',
  WORKBENCH_DOWNLOAD_BUTTON: 'workbench-download',

  // ── View navigation tabs ───────────────────────────────────────────────────
  TAB_PLAN: 'tab-plan',
  TAB_TRACK: 'tab-track',
  TAB_REVIEW: 'tab-review',

  // ── Tracker panel ──────────────────────────────────────────────────────────
  TRACKER_PANEL: 'tracker-panel',
  TRACKER_NEXT_BUTTON: 'tracker-next',
  TRACKER_CURRENT_BLOCK_LABEL: 'tracker-current-block',
  TRACKER_ROUND_INDICATOR: 'tracker-round',
  TRACKER_REP_INDICATOR: 'tracker-reps',
  TRACKER_COMPLETION_BANNER: 'tracker-completion',

  // ── Timer display ──────────────────────────────────────────────────────────
  TIMER_DISPLAY: 'timer-display',
  TIMER_VALUE: 'timer-value',

  // ── Review panel ───────────────────────────────────────────────────────────
  REVIEW_PANEL: 'review-panel',
  REVIEW_RESULTS_TABLE: 'review-results-table',
  REVIEW_METRIC_ROW: 'review-metric-row',
  REVIEW_TOTAL_TIME: 'review-total-time',

  // ── Note editor panel ──────────────────────────────────────────────────────
  EDITOR_PANEL: 'editor-panel',
  EDITOR_CONTENT: 'editor-content',
  EDITOR_START_WORKOUT: 'editor-start-workout',

  // ── Runtime TestBench (acceptance story host) ─────────────────────────────
  TESTBENCH_ROOT: 'testbench-root',
  TESTBENCH_NEXT_BUTTON: 'testbench-next',
  TESTBENCH_RUNTIME_STACK: 'testbench-runtime-stack',
  TESTBENCH_MEMORY: 'testbench-memory',
  TESTBENCH_SCRIPT_EDITOR: 'testbench-script-editor',

  // ── Command palette ────────────────────────────────────────────────────────
  COMMAND_PALETTE_TRIGGER: 'command-palette-trigger',
  COMMAND_PALETTE_INPUT: 'command-palette-input',
  COMMAND_PALETTE_RESULTS: 'command-palette-results',
} as const;

export type TestId = (typeof TEST_IDS)[keyof typeof TEST_IDS];
