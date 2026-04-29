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
import type { IScriptRuntime, UseRuntimeExecutionReturn } from '@/hooks/useRuntimeTimer';
import type { WodBlock } from '../Editor/types';
import type { DocumentItem } from '../Editor/utils/documentStructure';
import type { Segment, AnalyticsGroup } from '../../core/models/AnalyticsModels';
import type { IMetric } from '../../core/models/Metric';
import { MetricContainer } from '../../core/models/MetricContainer';
import type { IRpcTransport } from '@/hooks/useCastSignaling';
import type { ViewMode } from '@/panels/panel-system/ResponsiveViewport';

/**
 * Default no-op execution return used before the bridge hydrates the store
 */
const noopExecution: UseRuntimeExecutionReturn = {
  status: 'idle',
  elapsedTime: 0,
  stepCount: 0,
  startTime: null,
  start: () => { },
  pause: () => { },
  stop: () => { },
  reset: () => { },
  step: () => { },
};

// ─── Handles interface (React hook closures — kept separate from plain state) ─

export interface WorkbenchHandles {
  handleStart: () => void;
  handlePause: () => void;
  handleStop: () => void;
  handleNext: () => void;
  handleStartWorkoutAction: (block: WodBlock) => void;
}

const noopHandles: WorkbenchHandles = {
  handleStart: () => { },
  handlePause: () => { },
  handleStop: () => { },
  handleNext: () => { },
  handleStartWorkoutAction: () => { },
};

// ─── State shape ───────────────────────────────────────────────

interface WorkbenchSyncState {
  // --- Runtime & Execution (hydrated from React hooks via bridge) ---
  runtime: IScriptRuntime | null;
  execution: UseRuntimeExecutionReturn;

  // --- Execution Handles (React hook closures, injected via bridge) ---
  handles: WorkbenchHandles;

  // --- Active Tracking (derived from runtime stack) ---
  activeSegmentIds: Set<number>;
  activeStatementIds: Set<number>;

  // --- Analytics (persisted across runtime disposal) ---
  analyticsSegments: Segment[];
  analyticsGroups: AnalyticsGroup[];
  selectedAnalyticsIds: Set<number>;
  lastSelectedAnalyticsId: number | null;

  // --- Review Grid ---
  /** User-supplied metrics overrides keyed by sourceBlockKey */
  userOutputOverrides: Map<string, MetricContainer>;
  /** Active grid view preset id ('default' | 'debug' | custom) */
  gridViewPreset: string;

  // --- Cross-Panel Interaction ---
  hoveredBlockKey: string | null;

  // --- Document Structure ---
  documentItems: DocumentItem[];
  selectedBlock: WodBlock | null;
  selectedBlockId: string | null;

  // --- Editor Bridge ---
  cursorLine: number;
  highlightedLine: number | null;

  // --- Cast Transport (shared between CastButtonRpc and WorkbenchCastBridge) ---
  /** Active RPC transport while casting, null otherwise */
  castTransport: IRpcTransport | null;

  // --- Navigation View Mode (synced from WorkbenchContext) ---
  /** Current view mode in the browser workbench — drives receiver display mode */
  viewMode: ViewMode;
}

// ─── Actions ───────────────────────────────────────────────────

interface WorkbenchSyncActions {
  // --- Pure state setters ---
  setActiveSegmentIds: (ids: Set<number>) => void;
  setActiveStatementIds: (ids: Set<number>) => void;
  setAnalytics: (segments: Segment[], groups: AnalyticsGroup[]) => void;
  toggleAnalyticsSegment: (id: number, modifiers?: { ctrlKey: boolean; shiftKey: boolean }, visibleIds?: number[]) => void;

  // --- Review Grid Actions ---
  setUserOverride: (blockKey: string, metrics: MetricContainer | IMetric[]) => void;
  clearUserOverride: (blockKey: string) => void;
  setGridViewPreset: (presetId: string) => void;
  setHoveredBlockKey: (key: string | null) => void;
  setDocumentItems: (items: DocumentItem[]) => void;
  setSelectedBlock: (block: WodBlock | null) => void;
  setSelectedBlockId: (id: string | null) => void;
  setCursorLine: (line: number) => void;
  setHighlightedLine: (line: number | null) => void;
  setCastTransport: (transport: IRpcTransport | null) => void;
  setViewMode: (mode: ViewMode) => void;

  // --- Runtime & execution setters (replaces _hydrateRuntime) ---
  setRuntime: (runtime: IScriptRuntime | null) => void;
  setExecution: (execution: UseRuntimeExecutionReturn) => void;
  setHandles: (handles: WorkbenchHandles) => void;

  /** Resets the entire store to its initial state */
  resetStore: () => void;
}

// ─── Combined store type ───────────────────────────────────────

export type WorkbenchSyncStore = WorkbenchSyncState & WorkbenchSyncActions;

// ─── Store instance ────────────────────────────────────────────

export const useWorkbenchSyncStore = create<WorkbenchSyncStore>()((set) => ({
  // --- Initial state ---
  runtime: null,
  execution: noopExecution,
  handles: noopHandles,

  activeSegmentIds: new Set(),
  activeStatementIds: new Set(),

  analyticsSegments: [],
  analyticsGroups: [],
  selectedAnalyticsIds: new Set(),
  lastSelectedAnalyticsId: null,

  userOutputOverrides: new Map(),
  gridViewPreset: 'default',

  hoveredBlockKey: null,

  documentItems: [],
  selectedBlock: null,
  selectedBlockId: null,

  cursorLine: 1,
  highlightedLine: null,

  castTransport: null,

  viewMode: 'plan' as ViewMode,

  // --- Actions ---

  setActiveSegmentIds: (ids) => set({ activeSegmentIds: ids }),
  setActiveStatementIds: (ids) => set({ activeStatementIds: ids }),

  setAnalytics: (segments, groups) => set({
    analyticsSegments: segments,
    analyticsGroups: groups,
  }),

  toggleAnalyticsSegment: (id, modifiers, visibleIds) => set((state) => {
    const next = new Set(state.selectedAnalyticsIds);

    if (modifiers?.shiftKey && state.lastSelectedAnalyticsId !== null && visibleIds) {
      const idx1 = visibleIds.indexOf(state.lastSelectedAnalyticsId);
      const idx2 = visibleIds.indexOf(id);
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        const rangeIds = visibleIds.slice(start, end + 1);
        rangeIds.forEach(rid => next.add(rid));
      }
    } else if (modifiers?.ctrlKey) {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    } else {
      next.clear();
      next.add(id);
    }

    return {
      selectedAnalyticsIds: next,
      lastSelectedAnalyticsId: id
    };
  }),

  setUserOverride: (blockKey, metrics) => set((state) => {
    const next = new Map(state.userOutputOverrides);
    next.set(blockKey, MetricContainer.from(metrics, blockKey));
    return { userOutputOverrides: next };
  }),

  clearUserOverride: (blockKey) => set((state) => {
    const next = new Map(state.userOutputOverrides);
    next.delete(blockKey);
    return { userOutputOverrides: next };
  }),

  setGridViewPreset: (presetId) => set({ gridViewPreset: presetId }),

  setHoveredBlockKey: (key) => set({ hoveredBlockKey: key }),
  setDocumentItems: (items) => set({ documentItems: items }),
  setSelectedBlock: (block) => set({ selectedBlock: block }),
  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
  setCursorLine: (line) => set({ cursorLine: line }),
  setHighlightedLine: (line) => set({ highlightedLine: line }),
  setCastTransport: (castTransport) => set({ castTransport }),
  setViewMode: (viewMode) => set({ viewMode }),

  // Bridge runtime setters
  setRuntime: (runtime) => set({ runtime }),
  setExecution: (execution) => set({ execution }),
  setHandles: (handles) => set({ handles }),

  // Reset the store to its initial state
  resetStore: () => set({
    runtime: null,
    execution: noopExecution,
    handles: noopHandles,

    activeSegmentIds: new Set(),
    activeStatementIds: new Set(),

    analyticsSegments: [],
    analyticsGroups: [],
    selectedAnalyticsIds: new Set(),
    lastSelectedAnalyticsId: null,

    userOutputOverrides: new Map(),
    gridViewPreset: 'default',

    hoveredBlockKey: null,

    documentItems: [],
    selectedBlock: null,
    selectedBlockId: null,

    cursorLine: 1,
    highlightedLine: null,

    castTransport: null,

    viewMode: 'plan' as ViewMode,
  }),
}));
