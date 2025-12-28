/**
 * RuntimeProvider - React context for managing ScriptRuntime lifecycle
 * 
 * This provider decouples runtime management from UI state (WorkbenchContext).
 * It handles:
 * - Runtime creation via IRuntimeFactory
 * - Automatic disposal when runtime changes
 * - Clean lifecycle management
 * 
 * Usage:
 * ```tsx
 * <RuntimeProvider factory={runtimeFactory}>
 *   <App />
 * </RuntimeProvider>
 * 
 * // In child components:
 * const { runtime, initializeRuntime, disposeRuntime } = useRuntime();
 * ```
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { IRuntimeFactory } from '../../runtime/compiler/RuntimeFactory';
import { executionLogService } from '../../services/ExecutionLogService';
import type { WodBlock } from '../../markdown-editor/types';
import { RuntimeContext, type RuntimeContextState } from './RuntimeContext';

// Re-export useRuntime for backward compatibility
export { useRuntime } from './useRuntime';

/**
 * Props for RuntimeProvider
 */
interface RuntimeProviderProps {
  /** Factory for creating runtime instances */
  factory: IRuntimeFactory;

  /** Child components */
  children: React.ReactNode;
}

/**
 * RuntimeProvider Component
 * 
 * Manages the lifecycle of ScriptRuntime instances:
 * - Creates runtimes via injected factory
 * - Automatically disposes old runtime when new one is created
 * - Cleans up on unmount
 */
export const RuntimeProvider: React.FC<RuntimeProviderProps> = ({
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

  const value: RuntimeContextState = {
    runtime,
    isInitializing,
    error,
    initializeRuntime,
    disposeRuntime
  };

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
};

export default RuntimeProvider;
