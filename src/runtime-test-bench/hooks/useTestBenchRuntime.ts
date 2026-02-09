/**
 * useTestBenchRuntime - Shared hook for test bench runtime lifecycle
 * 
 * Extracts the common runtime construction, snapshot polling, and disposal
 * patterns shared between RuntimeTestBench and BlockTestBench.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { RuntimeStack } from '../../runtime/RuntimeStack';
import { RuntimeClock } from '../../runtime/RuntimeClock';
import { EventBus } from '../../runtime/events/EventBus';
import { StartWorkoutAction } from '../../runtime/actions/stack/StartWorkoutAction';
import { WodScript, IScript } from '../../parser/WodScript';
import { RuntimeAdapter } from '../adapters/RuntimeAdapter';
import { useRuntimeExecution } from './useRuntimeExecution';
import { globalCompiler } from '../services/testbench-services';
import { ICodeStatement } from '../../core/models/CodeStatement';
import type { JitCompiler } from '../../runtime/compiler/JitCompiler';

export interface UseTestBenchRuntimeOptions {
  /** Dispatch function to update test bench state */
  dispatch: React.Dispatch<any>;
  
  /** Whether to auto-poll snapshots when running @default true */
  autoSnapshot?: boolean;
  
  /** Snapshot polling interval in ms @default 100 */
  snapshotIntervalMs?: number;

  /** Custom compiler (defaults to globalCompiler) */
  compiler?: JitCompiler;
}

export interface UseTestBenchRuntimeReturn {
  /** Current ScriptRuntime instance, or null if not compiled */
  runtime: ScriptRuntime | null;
  
  /** Runtime execution controls (start, pause, stop, step, reset, status, elapsedTime) */
  execution: ReturnType<typeof useRuntimeExecution>;
  
  /** Compile statements into a new runtime */
  compile: (code: string, statements: ICodeStatement[], errors?: any[]) => ScriptRuntime | null;

  /** Compile from a pre-parsed script */
  compileScript: (script: IScript) => ScriptRuntime | null;
  
  /** Take a snapshot of current runtime state and dispatch it */
  updateSnapshot: () => void;
  
  /** Reset runtime and clear snapshot */
  resetRuntime: () => void;
}

/**
 * Shared hook that manages the runtime lifecycle for test benches.
 * 
 * Handles:
 * - Runtime construction from parsed statements
 * - Automatic snapshot polling while running
 * - Snapshot updates on demand
 * - Clean reset/disposal
 */
export function useTestBenchRuntime(options: UseTestBenchRuntimeOptions): UseTestBenchRuntimeReturn {
  const {
    dispatch,
    autoSnapshot = true,
    snapshotIntervalMs = 100,
    compiler = globalCompiler
  } = options;

  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  const adapter = useMemo(() => new RuntimeAdapter(), []);
  const execution = useRuntimeExecution(runtime);

  const updateSnapshot = useCallback(() => {
    if (runtime) {
      const newSnapshot = adapter.createSnapshot(runtime);
      dispatch({ type: 'SET_SNAPSHOT', payload: newSnapshot });
    }
  }, [runtime, adapter, dispatch]);

  // Auto-poll snapshots while running
  useEffect(() => {
    if (autoSnapshot && execution.status === 'running' && runtime) {
      const interval = setInterval(updateSnapshot, snapshotIntervalMs);
      return () => clearInterval(interval);
    }
  }, [autoSnapshot, execution.status, runtime, snapshotIntervalMs, updateSnapshot]);

  const compileScript = useCallback((script: IScript): ScriptRuntime | null => {
    const dependencies = {
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };

    const newRuntime = new ScriptRuntime(script as any, compiler, dependencies);
    newRuntime.do(new StartWorkoutAction());

    if (newRuntime.stack.count > 0) {
      setRuntime(newRuntime);
      const newSnapshot = adapter.createSnapshot(newRuntime);
      dispatch({ type: 'SET_SNAPSHOT', payload: newSnapshot });
      return newRuntime;
    }

    return null;
  }, [compiler, adapter, dispatch]);

  const compile = useCallback((code: string, statements: ICodeStatement[], errors: any[] = []): ScriptRuntime | null => {
    const script = new WodScript(code, statements, errors);
    return compileScript(script);
  }, [compileScript]);

  const resetRuntime = useCallback(() => {
    execution.reset();
    setRuntime(null);
    dispatch({ type: 'SET_SNAPSHOT', payload: null });
  }, [execution, dispatch]);

  return {
    runtime,
    execution,
    compile,
    compileScript,
    updateSnapshot,
    resetRuntime
  };
}
