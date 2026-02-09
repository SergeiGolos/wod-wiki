/**
 * RuntimeLifecycleProvider - React context for managing ScriptRuntime lifecycle
 * 
 * This provider manages the full lifecycle of ScriptRuntime instances:
 * - Runtime creation via IRuntimeFactory
 * - Automatic disposal when runtime changes
 * - Clean lifecycle management
 * 
 * For simple runtime injection (passing a pre-created IScriptRuntime to children),
 * use ScriptRuntimeProvider from '@/runtime/context/RuntimeContext' instead.
 * 
 * Usage:
 * ```tsx
 * <RuntimeLifecycleProvider factory={runtimeFactory}>
 *   <App />
 * </RuntimeLifecycleProvider>
 * 
 * // In child components:
 * const { runtime, initializeRuntime, disposeRuntime } = useRuntimeLifecycle();
 * ```
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { IRuntimeFactory } from '../../runtime/compiler/RuntimeFactory';
import { executionLogService } from '../../services/ExecutionLogService';
import type { WodBlock } from '../../markdown-editor/types';
import { RuntimeLifecycleContext, type RuntimeLifecycleState } from './RuntimeLifecycleContext';

// Re-export hooks for backward compatibility
export { useRuntimeLifecycle, useRuntime } from './useRuntimeLifecycle';

/**
 * Props for RuntimeLifecycleProvider
 */
interface RuntimeLifecycleProviderProps {
  /** Factory for creating runtime instances */
  factory: IRuntimeFactory;

  /** Child components */
  children: React.ReactNode;
}

/**
 * RuntimeLifecycleProvider Component
 * 
 * Manages the lifecycle of ScriptRuntime instances:
 * - Creates runtimes via injected factory
 * - Automatically disposes old runtime when new one is created
 * - Cleans up on unmount
 */
export const RuntimeLifecycleProvider: React.FC<RuntimeLifecycleProviderProps> = ({
  factory,
  children
}) => {
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep factory ref to avoid recreating callbacks
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  // Track current runtime in a ref to avoid stale closure issues
  const currentRuntimeRef = useRef<ScriptRuntime | null>(null);

  /**
   * Dispose the current runtime safely
   */
  const disposeRuntime = useCallback(() => {
    setRuntime(currentRuntime => {
      if (currentRuntime) {
        try {
          factoryRef.current.disposeRuntime(currentRuntime);
        } catch (err) {
          console.error('[RuntimeProvider] Error disposing runtime:', err);
        }
      }
      return null;
    });
    setError(null);
  }, []);

  /**
   * Initialize a new runtime for the given block
   * Automatically disposes existing runtime first
   */
  const initializeRuntime = useCallback((block: WodBlock) => {
    // Guard against duplicate initialization
    if (isInitializing) {
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Create new runtime FIRST before disposing old one
      const newRuntime = factoryRef.current.createRuntime(block) as ScriptRuntime | null;

      // Now do a single atomic state update that disposes old and sets new
      setRuntime(currentRuntime => {
        if (currentRuntime) {
          try {
            executionLogService.cleanup();
            factoryRef.current.disposeRuntime(currentRuntime);
          } catch (err) {
            console.error('[RuntimeProvider] Error disposing existing runtime:', err);
          }
        }
        return newRuntime;
      });

      if (newRuntime) {
        executionLogService.startSession(newRuntime);
        currentRuntimeRef.current = newRuntime;
      } else {
        currentRuntimeRef.current = null;
      }
    } catch (err) {
      console.error('[RuntimeProvider] Error creating runtime:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      currentRuntimeRef.current = null;
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing]);

  // Cleanup on unmount - use ref to avoid stale closure
  useEffect(() => {
    return () => {
      // Use ref to get current runtime value, avoiding stale closure
      if (currentRuntimeRef.current) {
        try {
          executionLogService.cleanup();
          factoryRef.current.disposeRuntime(currentRuntimeRef.current);
        } catch (err) {
          console.error('[RuntimeProvider] Error disposing runtime on unmount:', err);
        }
      }
    };
  }, []); // Empty deps - only run on unmount

  const value: RuntimeLifecycleState = {
    runtime,
    isInitializing,
    error,
    initializeRuntime,
    disposeRuntime
  };

  return (
    <RuntimeLifecycleContext.Provider value={value}>
      {children}
    </RuntimeLifecycleContext.Provider>
  );
};

/** @deprecated Use RuntimeLifecycleProvider instead */
export const RuntimeProvider = RuntimeLifecycleProvider;

export default RuntimeLifecycleProvider;
