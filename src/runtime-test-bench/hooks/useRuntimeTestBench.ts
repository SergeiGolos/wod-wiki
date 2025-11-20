import { useState, useCallback } from 'react';
import { RuntimeTestBenchState, MemoryGrouping, Theme, CompilationTab, UseRuntimeTestBenchReturn } from '../types/interfaces';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { useRuntimeSnapshot } from './useRuntimeSnapshot';
import { useHighlighting } from './useHighlighting';

/**
 * Main hook that orchestrates the entire Runtime Test Bench state and actions
 * Integrates all sub-hooks and provides a unified interface for components
 *
 * @param initialScript - Initial workout script
 * @returns Complete test bench state and actions
 */
export function useRuntimeTestBench(initialScript: string = ''): UseRuntimeTestBenchReturn {
  // Core state
  const [state, setState] = useState<RuntimeTestBenchState>({
    script: initialScript,
    parseResults: {
      statements: [],
      errors: [],
      warnings: [],
      status: 'idle'
    },
    status: 'idle',
    stepCount: 0,
    elapsedTime: 0,
    eventQueue: [],
    highlighting: {},
    compilationTab: 'output',
    compilationLog: [],
    memoryFilterText: '',
    memoryGroupBy: 'owner',
    theme: 'system',
    showMemory: true,
    showStack: true,
    fontSize: 14
  });

  // Sub-hooks
  const snapshotResult = useRuntimeSnapshot(state.runtime);
  const highlighting = useHighlighting();

  // Computed snapshot
  const snapshot = snapshotResult.snapshot;

  // Script actions
  const updateScript = useCallback((script: string) => {
    setState(prev => ({
      ...prev,
      script,
      // Reset execution state when script changes
      runtime: undefined,
      status: 'idle',
      stepCount: 0,
      elapsedTime: 0,
      eventQueue: []
    }));
  }, []);

  const loadScript = useCallback((script: string, _name?: string) => {
    updateScript(script);
    // TODO: Handle script name for display purposes
  }, [updateScript]);

  // Execution actions
  const run = useCallback(() => {
    if (!state.runtime) return;

    setState(prev => ({
      ...prev,
      status: 'executing'
    }));

    // TODO: Implement actual execution logic
    // This would trigger the runtime to start executing
  }, [state.runtime]);

  const stepExecution = useCallback(() => {
    if (!state.runtime) return;

    // TODO: Implement step execution
    setState(prev => ({
      ...prev,
      stepCount: prev.stepCount + 1
    }));
  }, [state.runtime]);

  const stepOver = useCallback(() => {
    // TODO: Implement step over logic
    stepExecution();
  }, [stepExecution]);

  const stepInto = useCallback(() => {
    // TODO: Implement step into logic
    stepExecution();
  }, [stepExecution]);

  const resetExecution = useCallback(() => {
    setState(prev => ({
      ...prev,
      runtime: undefined,
      status: 'idle',
      stepCount: 0,
      elapsedTime: 0,
      eventQueue: []
    }));
  }, []);

  const pauseExecution = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: prev.status === 'executing' ? 'paused' : prev.status
    }));
  }, []);

  // UI actions
  const setHighlightedBlock = useCallback((blockKey?: string, line?: number) => {
    highlighting.setBlockHighlight(blockKey, 'stack');
    setState(prev => ({
      ...prev,
      highlighting: {
        ...prev.highlighting,
        blockKey,
        line
      }
    }));
  }, [highlighting]);

  const setHighlightedMemory = useCallback((memoryId?: string, ownerKey?: string) => {
    highlighting.setMemoryHighlight(memoryId, 'memory');
    setState(prev => ({
      ...prev,
      highlighting: {
        ...prev.highlighting,
        memoryId,
        ownerKey
      }
    }));
  }, [highlighting]);

  const setMemoryFilter = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      memoryFilterText: text
    }));
  }, []);

  const setMemoryGrouping = useCallback((groupBy: MemoryGrouping) => {
    setState(prev => ({
      ...prev,
      memoryGroupBy: groupBy
    }));
  }, []);

  const setCompilationTab = useCallback((tab: CompilationTab) => {
    setState(prev => ({
      ...prev,
      compilationTab: tab
    }));
  }, []);

  // Settings actions
  const setTheme = useCallback((theme: Theme) => {
    setState(prev => ({
      ...prev,
      theme
    }));
  }, []);

  const setFontSize = useCallback((size: number) => {
    setState(prev => ({
      ...prev,
      fontSize: Math.max(8, Math.min(24, size))
    }));
  }, []);

  const toggleMemoryPanel = useCallback(() => {
    setState(prev => ({
      ...prev,
      showMemory: !prev.showMemory
    }));
  }, []);

  const toggleStackPanel = useCallback(() => {
    setState(prev => ({
      ...prev,
      showStack: !prev.showStack
    }));
  }, []);

  return {
    // State
    state,
    snapshot,

    // Script Actions
    updateScript,
    loadScript,

    // Execution Actions
    run,
    stepExecution,
    stepOver,
    stepInto,
    resetExecution,
    pauseExecution,

    // UI Actions
    setHighlightedBlock,
    setHighlightedMemory,
    setMemoryFilter,
    setMemoryGrouping,
    setCompilationTab,

    // Settings Actions
    setTheme,
    setFontSize,
    toggleMemoryPanel,
    toggleStackPanel
  };
}
