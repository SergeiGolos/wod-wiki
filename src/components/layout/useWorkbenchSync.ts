/**
 * useWorkbenchSync - Backward-compatible hook for consuming workbench synced state
 *
 * Uses shallow equality on a selected subset of the store to avoid re-rendering
 * on every `execution.elapsedTime` tick (which updates at ~50fps).
 *
 * For new code / panel components, prefer using the Zustand store directly
 * with selectors for optimal re-render performance:
 *
 * ```tsx
 * import { useWorkbenchSyncStore } from './workbenchSyncStore';
 *
 * // Only re-renders when hoveredBlockKey changes
 * const hoveredBlockKey = useWorkbenchSyncStore(s => s.hoveredBlockKey);
 * ```
 */

import { useShallow } from 'zustand/react/shallow';
import { useWorkbenchSyncStore } from './workbenchSyncStore';

export const useWorkbenchSync = () => {
  return useWorkbenchSyncStore(
    useShallow(s => ({
      runtime: s.runtime,
      execution: s.execution,
      activeSegmentIds: s.activeSegmentIds,
      activeStatementIds: s.activeStatementIds,
      hoveredBlockKey: s.hoveredBlockKey,
      setHoveredBlockKey: s.setHoveredBlockKey,
      selectedBlock: s.selectedBlock,
      documentItems: s.documentItems,
      highlightedLine: s.highlightedLine,
      setHighlightedLine: s.setHighlightedLine,
      setCursorLine: s.setCursorLine,
      analyticsSegments: s.analyticsSegments,
      analyticsGroups: s.analyticsGroups,
      selectedAnalyticsIds: s.selectedAnalyticsIds,
      toggleAnalyticsSegment: s.toggleAnalyticsSegment,
      handleStart: s.handles.handleStart,
      handlePause: s.handles.handlePause,
      handleStop: s.handles.handleStop,
      handleNext: s.handles.handleNext,
      handleStartWorkoutAction: s.handles.handleStartWorkoutAction,
    }))
  );
};
