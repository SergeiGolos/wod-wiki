/**
 * useWorkbenchEffects - Bridges React hooks into the Zustand store
 *
 * Performs two jobs:
 *
 * 1. **Hydration** — Reads React hook values (runtime, execution, controls)
 *    and pushes them into the Zustand store so panels can consume them
 *    via selectors without needing a Context provider.
 *
 * 2. **Side Effects** — Runs all the application-logic effects:
 *    - Runtime initialization/disposal on view mode changes
 *    - Wake lock management
 *    - Analytics polling and refresh
 *    - Active segment/statement derivation from runtime stack
 *    - Document structure computation
 *    - Cursor → activeBlockId mapping
 */

import { useEffect, useRef, useMemo } from 'react';
import { useWorkbench } from '@/contexts/WorkbenchContext';
import { useWorkbenchRuntime } from '@/hooks/useWorkbenchRuntime';
import { useWakeLock } from '../../hooks/useWakeLock';
import { parseDocumentStructure } from '../Editor/utils/documentStructure';
import { getAnalyticsFromRuntime, getAnalyticsFromLogs } from '@/hooks/useWorkbenchServices';
import { hashCode } from '../../lib/utils';
import { useWorkbenchSyncStore } from '@/stores/workbenchSyncStore';
import { ScriptBlock } from '../Editor/types';
import { useProjectionSync } from '@/contexts/ProjectionSyncContext';

// Helper to generate a unique key for a block based on its content/statements
const getBlockKey = (block: ScriptBlock | null): string => {
  if (!block) return 'null';
  return `${block.id}-v${block.version || 0}-${block.statements?.length || 0}-${hashCode(JSON.stringify(block.statements || []))}`;
};

export function useWorkbenchEffects(): void {
  const store = useWorkbenchSyncStore;
  const projectionSync = useProjectionSync();

  const {
    content,
    blocks,
    viewMode,
    setActiveBlockId,
    startWorkout,
    completeWorkout,
    currentEntry,
  } = useWorkbench();

  const selectedBlockId = useWorkbenchSyncStore(s => s.selectedBlockId);
  const selectedBlock = useWorkbenchSyncStore(s => s.selectedBlock);

  // --- Document structure → store ---
  const documentItems = useMemo(() => {
    return parseDocumentStructure(content, blocks);
  }, [content, blocks]);

  useEffect(() => {
    store.getState().setDocumentItems(documentItems);
  }, [documentItems]);

  // --- Cursor → activeBlockId mapping ---
  const cursorLine = store(s => s.cursorLine);

  useEffect(() => {
    const item = documentItems.find(
      item => cursorLine >= item.startLine && cursorLine <= item.endLine
    );
    setActiveBlockId(item?.id || null);
  }, [documentItems, cursorLine, setActiveBlockId]);


  // Clear stale analytics whenever the user navigates to a different note.
  const lastSelectedBlockIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (selectedBlockId !== lastSelectedBlockIdRef.current) {
      if (lastSelectedBlockIdRef.current !== undefined) {
        console.log('[useWorkbenchEffects] Block navigated:', lastSelectedBlockIdRef.current, '→', selectedBlockId, '— clearing analytics for Chromecast');
        store.getState().setAnalytics([], []);
      }
      lastSelectedBlockIdRef.current = selectedBlockId;
    }
  }, [selectedBlockId]);


  // --- Runtime lifecycle & execution ---
  const {
    runtime,
    initializeRuntime,
    disposeRuntime,
    execution,
    handleStart,
    handlePause,
    handleStop,
    handleNext,
    handleStartWorkoutAction,
  } = useWorkbenchRuntime(viewMode, selectedBlock, completeWorkout, startWorkout);

  // --- Hydrate runtime + controls into Zustand store ---
  useEffect(() => {
    store.getState().setRuntime(runtime);
  }, [runtime]);

  useEffect(() => {
    store.getState().setExecution(execution);
  }, [execution.status, execution.elapsedTime, execution.stepCount, execution.startTime]);

  useEffect(() => {
    store.getState().setHandles({ handleStart, handlePause, handleStop, handleNext, handleStartWorkoutAction });
  }, [handleStart, handlePause, handleStop, handleNext, handleStartWorkoutAction]);

  // --- Runtime initialization on view mode changes ---
  const lastInitializedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (viewMode === 'track' && selectedBlock && selectedBlock.statements) {
      const currentKey = getBlockKey(selectedBlock);
      if (lastInitializedKeyRef.current !== currentKey) {
        console.log('[useWorkbenchEffects] Re-initializing runtime for block', selectedBlock.id, 'old:', lastInitializedKeyRef.current, 'new:', currentKey);
        store.getState().setAnalytics([], []);
        initializeRuntime(selectedBlock);
        lastInitializedKeyRef.current = currentKey;
      }
    } else if (viewMode !== 'track') {
      if (lastInitializedKeyRef.current !== null) {
        disposeRuntime();
        lastInitializedKeyRef.current = null;
      }
    }
  }, [viewMode, selectedBlock, initializeRuntime, disposeRuntime]);

  // --- Wake lock ---
  useWakeLock({
    enabled: viewMode === 'track' && execution.status === 'running',
  });

  // --- Analytics polling ---
  const lastAnalyticsUpdateRef = useRef(0);
  const lastStatusRef = useRef(execution.status);

  useEffect(() => {
    if (runtime) {
      const now = Date.now();
      const statusChanged = execution.status !== lastStatusRef.current;
      const shouldUpdate = statusChanged || (now - lastAnalyticsUpdateRef.current > 1000);

      if (shouldUpdate) {
        const { segments, groups } = getAnalyticsFromRuntime(runtime);
        store.getState().setAnalytics(segments, groups);

        let totalElapsedMs = 0;
        for (const seg of segments) {
          if (seg.elapsed !== undefined) {
            totalElapsedMs += seg.elapsed * 1000;
          }
        }

        projectionSync?.updateFromSegments(
          segments,
          totalElapsedMs,
          segments.length,
        );

        lastAnalyticsUpdateRef.current = now;
        lastStatusRef.current = execution.status;
      }
    } else if (currentEntry?.results?.logs) {
      const logs = currentEntry.results.logs;
      const { segments, groups } = getAnalyticsFromLogs(logs, currentEntry.results.startTime);
      store.getState().setAnalytics(segments, groups);
    }
  }, [runtime, execution.stepCount, execution.status, currentEntry]);

  // --- Active segment/statement tracking ---
  useEffect(() => {
    if (!runtime || viewMode !== 'track') {
      store.getState().setActiveSegmentIds(new Set());
      store.getState().setActiveStatementIds(new Set());
      return;
    }

    const segmentIds = new Set(
      runtime.stack.blocks.map(block => hashCode(block.key.toString()))
    );
    store.getState().setActiveSegmentIds(segmentIds);

    const statementIds = new Set<number>();
    const leafBlock = runtime.stack.current;
    if (leafBlock && leafBlock.sourceIds) {
      leafBlock.sourceIds.forEach(id => statementIds.add(id));
    }
    store.getState().setActiveStatementIds(statementIds);
  }, [runtime, execution.stepCount, viewMode]);

  // --- Reset store on unmount ---
  useEffect(() => {
    return () => {
      console.log('[useWorkbenchEffects] Unmounting, resetting store');
      store.getState().resetStore();
    };
  }, []);
}
