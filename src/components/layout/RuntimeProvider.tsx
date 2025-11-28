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

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { IRuntimeFactory } from '../../runtime/RuntimeFactory';
import type { WodBlock } from '../../markdown-editor/types';

/**
 * Runtime context state interface
 */
interface RuntimeContextState {
  /** Current active runtime instance (null if none) */
  runtime: ScriptRuntime | null;
  
  /** Whether runtime is currently initializing */
  isInitializing: boolean;
  
  /** Error from last runtime operation */
  error: Error | null;
  
  /** Initialize a new runtime for the given block */
  initializeRuntime: (block: WodBlock) => void;
  
  /** Dispose the current runtime */
  disposeRuntime: () => void;
}

const RuntimeContext = createContext<RuntimeContextState | undefined>(undefined);

/**
 * Hook to access runtime context
 * @throws Error if used outside RuntimeProvider
 */
export const useRuntime = (): RuntimeContextState => {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error('useRuntime must be used within a RuntimeProvider');
  }
  return context;
};

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

  /**
   * Dispose the current runtime safely
   */
  const disposeRuntime = useCallback(() => {
    setRuntime(currentRuntime => {
      if (currentRuntime) {
        console.log('[RuntimeProvider] Disposing current runtime');
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
    console.log('[RuntimeProvider] Initializing runtime for block:', block.id);
    setIsInitializing(true);
    setError(null);

    // Dispose existing runtime first
    setRuntime(currentRuntime => {
      if (currentRuntime) {
        console.log('[RuntimeProvider] Disposing existing runtime before creating new one');
        try {
          factoryRef.current.disposeRuntime(currentRuntime);
        } catch (err) {
          console.error('[RuntimeProvider] Error disposing existing runtime:', err);
        }
      }
      return null;
    });

    try {
      const newRuntime = factoryRef.current.createRuntime(block);
      setRuntime(newRuntime);
      
      if (!newRuntime) {
        console.warn('[RuntimeProvider] Factory returned null runtime for block:', block.id);
      }
    } catch (err) {
      console.error('[RuntimeProvider] Error creating runtime:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[RuntimeProvider] Unmounting, disposing runtime');
      if (runtime) {
        try {
          factoryRef.current.disposeRuntime(runtime);
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
