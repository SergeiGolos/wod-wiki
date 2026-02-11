/**
 * workbenchSyncStore - Zustand store for cross-panel synced state
 *
 * Replaces the React Context-based WorkbenchSyncContext/Provider pattern.
 * Key advantages over the previous Context approach:
 *
 * 1. Selector-based subscriptions - panels only re-render when the specific
 *    slice they consume changes (e.g., ReviewPanel won't re-render on every
 *    20ms execution tick if it only reads analyticsData)
 *
 * 2. No Provider wrapper needed - store lives outside the React tree
 *
 * 3. No `useMemo`/`useCallback` boilerplate for context value assembly
 *
 * 4. Actions are inherently stable references (no dependency arrays)
 *
 * State categories:
 * 1. Runtime & execution  - runtime instance, execution status & controls
 * 2. Active tracking      - which segments/statements are currently active
 * 3. Analytics            - persisted analytics data (survives runtime dispose)
 * 4. Cross-panel          - hover highlighting, analytics selection
 * 5. Document             - parsed document structure, selected block
 * 6. Editor bridge        - cursor line, highlighted line
 */

import { create } from 'zustand';
import type { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';
import type { UseRuntimeExecutionReturn } from '../../runtime-test-bench/hooks/useRuntimeExecution';
import type { WodBlock } from '../../markdown-editor/types';
import type { DocumentItem } from '../../markdown-editor/utils/documentStructure';
import type { AnalyticsDataPoint } from '../../services/AnalyticsTransformer';
import type { Segment, AnalyticsGroup } from '../../core/models/AnalyticsModels';

/**
 * Default no-op execution return used before the bridge hydrates the store
 */
const noopExecution: UseRuntimeExecutionReturn = {
  status: 'idle',
  elapsedTime: 0,
  stepCount: 0,
  startTime: null,
  start: () => {},
  pause: () => {},
  stop: () => {},
  reset: () => {},
  step: () => {},
};

// ─── State shape ───────────────────────────────────────────────

interface WorkbenchSyncState {
  // --- Runtime & Execution (hydrated from React hooks via bridge) ---
  runtime: IScriptRuntime | null;
  execution: UseRuntimeExecutionReturn;
  initializeRuntime: (block: WodBlock) => void;
  disposeRuntime: () => void;

  // --- Execution Controls (hydrated from React hooks via bridge) ---
  handleStart: () => void;
  handlePause: () => void;
  handleStop: () => void;
  handleNext: () => void;
  handleStartWorkoutAction: (block: WodBlock) => void;

  // --- Active Tracking (derived from runtime stack) ---
  activeSegmentIds: Set<number>;
  activeStatementIds: Set<number>;

  // --- Analytics (persisted across runtime disposal) ---
  analyticsData: AnalyticsDataPoint[];
  analyticsSegments: Segment[];
  analyticsGroups: AnalyticsGroup[];
  selectedAnalyticsIds: Set<number>;

  // --- Cross-Panel Interaction ---
  hoveredBlockKey: string | null;

  // --- Document Structure ---
  documentItems: DocumentItem[];
  selectedBlock: WodBlock | null;

  // --- Editor Bridge ---
  cursorLine: number;
  highlightedLine: number | null;
}

// ─── Actions ───────────────────────────────────────────────────

interface WorkbenchSyncActions {
  // --- Pure state setters ---
  setActiveSegmentIds: (ids: Set<number>) => void;
  setActiveStatementIds: (ids: Set<number>) => void;
  setAnalytics: (data: AnalyticsDataPoint[], segments: Segment[], groups: AnalyticsGroup[]) => void;
  toggleAnalyticsSegment: (id: number) => void;
  setHoveredBlockKey: (key: string | null) => void;
  setDocumentItems: (items: DocumentItem[]) => void;
  setSelectedBlock: (block: WodBlock | null) => void;
  setCursorLine: (line: number) => void;
  setHighlightedLine: (line: number | null) => void;

  // --- Bridge hydration (called by WorkbenchSyncBridge to inject React hook values) ---
  _hydrateRuntime: (payload: {
    runtime: IScriptRuntime | null;
    execution: UseRuntimeExecutionReturn;
    initializeRuntime: (block: WodBlock) => void;
    disposeRuntime: () => void;
    handleStart: () => void;
    handlePause: () => void;
    handleStop: () => void;
    handleNext: () => void;
    handleStartWorkoutAction: (block: WodBlock) => void;
  }) => void;
}

// ─── Combined store type ───────────────────────────────────────

export type WorkbenchSyncStore = WorkbenchSyncState & WorkbenchSyncActions;

// ─── Store instance ────────────────────────────────────────────

export const useWorkbenchSyncStore = create<WorkbenchSyncStore>()((set) => ({
  // --- Initial state ---
  runtime: null,
  execution: noopExecution,
  initializeRuntime: () => {},
  disposeRuntime: () => {},
  handleStart: () => {},
  handlePause: () => {},
  handleStop: () => {},
  handleNext: () => {},
  handleStartWorkoutAction: () => {},

  activeSegmentIds: new Set(),
  activeStatementIds: new Set(),

  analyticsData: [],
  analyticsSegments: [],
  analyticsGroups: [],
  selectedAnalyticsIds: new Set(),

  hoveredBlockKey: null,

  documentItems: [],
  selectedBlock: null,

  cursorLine: 1,
  highlightedLine: null,

  // --- Actions ---

  setActiveSegmentIds: (ids) => set({ activeSegmentIds: ids }),
  setActiveStatementIds: (ids) => set({ activeStatementIds: ids }),

  setAnalytics: (data, segments, groups) => set({
    analyticsData: data,
    analyticsSegments: segments,
    analyticsGroups: groups,
  }),

  toggleAnalyticsSegment: (id) => set((state) => {
    const next = new Set(state.selectedAnalyticsIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { selectedAnalyticsIds: next };
  }),

  setHoveredBlockKey: (key) => set({ hoveredBlockKey: key }),
  setDocumentItems: (items) => set({ documentItems: items }),
  setSelectedBlock: (block) => set({ selectedBlock: block }),
  setCursorLine: (line) => set({ cursorLine: line }),
  setHighlightedLine: (line) => set({ highlightedLine: line }),

  // Bridge hydration — pushes React hook values into the store
  _hydrateRuntime: (payload) => set(payload),
}));
