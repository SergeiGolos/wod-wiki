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
import { useWorkbench } from './WorkbenchContext';
import { useWorkbenchRuntime } from '../workbench/useWorkbenchRuntime';
import { useWakeLock } from '../../hooks/useWakeLock';
import { parseDocumentStructure } from '../Editor/utils/documentStructure';
import { getAnalyticsFromRuntime, getAnalyticsFromLogs } from '../../services/AnalyticsTransformer';
import type { SegmentWithMetadata } from '../../services/AnalyticsTransformer';
import { hashCode } from '../../lib/utils';
import { useWorkbenchSyncStore } from './workbenchSyncStore';
import { WodBlock } from '../Editor/types';
import { indexedDBService } from '../../services/db/IndexedDBService';
import type { AnalyticsDataPoint } from '../../types/storage';
import { useProjectionSync } from '../../components/cast/ProjectionSyncContext';

// Helper to generate a unique key for a block based on its content/statements
const getBlockKey = (block: WodBlock | null): string => {
  if (!block) return 'null';
  return `${block.id}-v${block.version || 0}-${block.statements?.length || 0}-${hashCode(JSON.stringify(block.statements || []))}`;
};

/**
 * Convert in-memory SegmentWithMetadata[] to V4 AnalyticsDataPoint records
 * for persistence in IndexedDB. Each segment metric becomes a separate row.
 */
function segmentsToAnalyticsPoints(
  segments: SegmentWithMetadata[],
  noteId: string,
  resultId?: string,
): AnalyticsDataPoint[] {
  const now = Date.now();
  const points: AnalyticsDataPoint[] = [];

  for (const seg of segments) {
    const segId = String(seg.id);

    if (seg.elapsed != null && seg.elapsed > 0) {
      points.push({
        id: `${segId}-elapsed-${now}`,
        noteId,
        segmentId: segId,
        segmentVersion: 0,
        resultId: resultId ?? '',
        type: 'elapsed',
        value: seg.elapsed,
        unit: 's',
        label: `${seg.name ?? 'Segment'} – Elapsed`,
        timestamp: seg.absoluteStartTime ?? now,
        createdAt: now,
      });
    }

    for (const [key, value] of Object.entries(seg.metric)) {
      if (typeof value !== 'number') continue;
      points.push({
        id: `${segId}-${key}-${now}`,
        noteId,
        segmentId: segId,
        segmentVersion: 0,
        resultId: resultId ?? '',
        type: key,
        value,
        unit: '',
        label: `${seg.name ?? 'Segment'} – ${key}`,
        timestamp: seg.absoluteStartTime ?? now,
        createdAt: now,
      });
    }
  }

  return points;
}

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

  // --- Selected block resolution → store ---
  const selectedBlock = useMemo(() => {
    return blocks.find(b => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  useEffect(() => {
    store.getState().setSelectedBlock(selectedBlock);
  }, [selectedBlock]);

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

  // --- View mode → store ---
  useEffect(() => {
    store.getState().setViewMode(viewMode);
  }, [viewMode]);

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
  }, [execution]);

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

  // --- Persist analytics to IndexedDB on workout completion ---
  const hasPersisted = useRef(false);

  useEffect(() => {
    if (execution.status === 'running') {
      hasPersisted.current = false;
    }

    if (execution.status === 'completed' && !hasPersisted.current) {
      hasPersisted.current = true;

      const currentSegments = store.getState().analyticsSegments;
      const noteId = currentEntry?.id ?? selectedBlock?.id ?? 'unknown';

      if (currentSegments.length > 0) {
        const points = segmentsToAnalyticsPoints(currentSegments, noteId);
        indexedDBService.saveAnalyticsPoints(points)
          .then(() => console.log(`[useWorkbenchEffects] Persisted ${points.length} analytics points`))
          .catch((err: unknown) => console.error('[useWorkbenchEffects] Failed to persist analytics:', err));
      }
    }
  }, [execution.status, currentEntry, selectedBlock]);

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
