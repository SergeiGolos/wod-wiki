/**
 * WorkbenchSyncBridge - Bridges React hooks into the Zustand store
 *
 * This component sits in the React tree (inside RuntimeLifecycleProvider)
 * and performs two jobs:
 *
 * 1. **Hydration** — Reads React hook values (runtime, execution, controls)
 *    and pushes them into the Zustand store so panels can consume them
 *    via selectors without needing a Context provider.
 *
 * 2. **Side Effects** — Runs all the application-logic effects that were
 *    previously in WorkbenchSyncProvider:
 *    - Runtime initialization/disposal on view mode changes
 *    - Wake lock management
 *    - Analytics polling and refresh
 *    - Active segment/statement derivation from runtime stack
 *    - Document structure computation
 *    - Cursor → activeBlockId mapping
 *
 * This is a renderless component (returns only {children}).
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useWorkbench } from './WorkbenchContext';
import { useWorkbenchRuntime } from '../workbench/useWorkbenchRuntime';
import { useWakeLock } from '../../hooks/useWakeLock';
import { parseDocumentStructure } from '../../markdown-editor/utils/documentStructure';
import { getAnalyticsFromRuntime, getAnalyticsFromLogs } from '../../services/AnalyticsTransformer';
import type { SegmentWithMetadata } from '../../services/AnalyticsTransformer';
import { hashCode } from '../../lib/utils';
import { useWorkbenchSyncStore } from './workbenchSyncStore';
import { WodBlock } from '../../markdown-editor/types';
import { indexedDBService } from '../../services/db/IndexedDBService';
import type { AnalyticsDataPoint } from '../../types/storage';
import { useProjectionSync } from '../../components/cast/ProjectionSyncContext';

// Helper to generate a unique key for a block based on its content/statements
const getBlockKey = (block: WodBlock | null): string => {
  if (!block) return 'null';
  // Include version and hash of statements to ensure re-init when content or parsing changes
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

    // Persist elapsed time as a metric
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

    // Persist each dynamic metric (reps, resistance, distance, etc.)
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

interface WorkbenchSyncBridgeProps {
  children: React.ReactNode;
}

export const WorkbenchSyncBridge: React.FC<WorkbenchSyncBridgeProps> = ({ children }) => {
  const store = useWorkbenchSyncStore;
  const projectionSync = useProjectionSync();

  // --- Consume upstream React contexts ---
  const {
    content,
    blocks,
    selectedBlockId,
    viewMode,
    setActiveBlockId,
    startWorkout,
    completeWorkout,
    currentEntry,
  } = useWorkbench();

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
  // Without this, the Chromecast stays stuck on the old completed/review state
  // because analyticsSegments is only cleared inside the 'track' runtime-init
  // effect, which doesn't run for non-track viewModes (e.g., 'review').
  const lastSelectedBlockIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (selectedBlockId !== lastSelectedBlockIdRef.current) {
      if (lastSelectedBlockIdRef.current !== undefined) {
        console.log('[WorkbenchSyncBridge] Block navigated:', lastSelectedBlockIdRef.current, '→', selectedBlockId, '— clearing analytics for Chromecast');
        store.getState().setAnalytics([], []);
      }
      lastSelectedBlockIdRef.current = selectedBlockId;
    }
  }, [selectedBlockId]);

  // --- View mode → store (drives receiver display mode over RPC) ---
  useEffect(() => {
    store.getState().setViewMode(viewMode);
  }, [viewMode]);

  // --- Runtime lifecycle & execution (from React hooks) ---
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
    store.getState()._hydrateRuntime({
      runtime,
      execution,
      initializeRuntime,
      disposeRuntime,
      handleStart,
      handlePause,
      handleStop,
      handleNext,
      handleStartWorkoutAction,
    });
  }, [
    runtime,
    execution,
    initializeRuntime,
    disposeRuntime,
    handleStart,
    handlePause,
    handleStop,
    handleNext,
    handleStartWorkoutAction,
  ]);

  // --- Runtime initialization on view mode changes ---
  // --- Runtime initialization on view mode changes ---
  const lastInitializedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (viewMode === 'track' && selectedBlock && selectedBlock.statements) {
      const currentKey = getBlockKey(selectedBlock);
      if (lastInitializedKeyRef.current !== currentKey) {
        console.log('[WorkbenchSyncBridge] Re-initializing runtime for block', selectedBlock.id, 'old:', lastInitializedKeyRef.current, 'new:', currentKey);
        
        // Clear analytics before starting the new runtime
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

  // --- Wake lock (keep screen awake during workouts) ---
  useWakeLock({
    enabled: viewMode === 'track' && execution.status === 'running',
  });

  // --- Analytics polling (persisted across runtime disposal) ---
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

        // Calculate total elapsed time and segment count for projection sync
        let totalElapsedMs = 0;
        for (const seg of segments) {
          if (seg.elapsed !== undefined) {
            totalElapsedMs += seg.elapsed * 1000; // Convert seconds to ms
          }
        }

        // Send projection results to Chromecast
        projectionSync?.updateFromSegments(
          segments,
          totalElapsedMs,
          segments.length,
        );

        lastAnalyticsUpdateRef.current = now;
        lastStatusRef.current = execution.status;
      }
    } else if (currentEntry?.results?.logs) {
      // If no runtime, but we have historical logs, use them for analytics
      const logs = currentEntry.results.logs;
      const { segments, groups } = getAnalyticsFromLogs(logs, currentEntry.results.startTime);
      store.getState().setAnalytics(segments, groups);
    }
    // We REMOVED the auto-clear else block here.
    // Analytics will persist until:
    // 1. A new runtime starts (overwrites)
    // 2. A new entry with logs is loaded (overwrites)
    // 3. Manual Reset (calls store.resetStore())
    // 4. Bridge unmounts (calls store.resetStore())
  }, [runtime, execution.stepCount, execution.status, currentEntry]);

  // --- Persist analytics to IndexedDB on workout completion ---
  const hasPersisted = useRef(false);

  useEffect(() => {
    // Reset the flag when a new runtime starts
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
          .then(() => console.log(`[WorkbenchSyncBridge] Persisted ${points.length} analytics points`))
          .catch((err: unknown) => console.error('[WorkbenchSyncBridge] Failed to persist analytics:', err));
      }
    }
  }, [execution.status, currentEntry, selectedBlock]);

  // --- Active segment/statement tracking (derived from runtime stack) ---
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
      console.log('[WorkbenchSyncBridge] Unmounting, resetting store');
      store.getState().resetStore();
    };
  }, []);

  return <>{children}</>;
};
