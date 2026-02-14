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
import { hashCode } from '../../lib/utils';
import { useWorkbenchSyncStore } from './workbenchSyncStore';
import { WodBlock } from '../../markdown-editor/types';

// Helper to generate a unique key for a block based on its content/statements
const getBlockKey = (block: WodBlock | null): string => {
  if (!block) return 'null';
  // Include validation hash if available, or just length/content signature
  return `${block.id}-${block.statements?.length || 0}-${hashCode(JSON.stringify(block.statements || []))}`;
};

interface WorkbenchSyncBridgeProps {
  children: React.ReactNode;
}

export const WorkbenchSyncBridge: React.FC<WorkbenchSyncBridgeProps> = ({ children }) => {
  const store = useWorkbenchSyncStore;

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
        const { data, segments, groups } = getAnalyticsFromRuntime(runtime);
        store.getState().setAnalytics(data, segments, groups);
        lastAnalyticsUpdateRef.current = now;
        lastStatusRef.current = execution.status;
      }
    } else if (currentEntry?.results?.logs) {
      // If no runtime, but we have historical logs, use them for analytics
      const logs = currentEntry.results.logs;
      const { data, segments, groups } = getAnalyticsFromLogs(logs, currentEntry.results.startTime);
      store.getState().setAnalytics(data, segments, groups);
    }
  }, [runtime, execution.stepCount, execution.status]);

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

  return <>{children}</>;
};
