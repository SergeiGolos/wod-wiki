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
import type { WodBlock } from '../../markdown-editor/types';
import { RuntimeLifecycleContext, type RuntimeLifecycleState } from './RuntimeLifecycleContext';
import { SubscriptionManager } from '../../runtime/subscriptions/SubscriptionManager';
import { LocalRuntimeSubscription } from '../../runtime/subscriptions/LocalRuntimeSubscription';
import { SubscriptionManagerContext } from './SubscriptionManagerContext';

export { useRuntimeLifecycle } from './useRuntimeLifecycle';

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
  const [subscriptionManager, setSubscriptionManager] = useState<SubscriptionManager | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep factory ref to avoid recreating callbacks
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  // Track current runtime and subscription manager in refs to avoid stale closure issues
  const currentRuntimeRef = useRef<ScriptRuntime | null>(null);
  const currentSubManagerRef = useRef<SubscriptionManager | null>(null);

  /**
   * Dispose the current runtime safely
   */
  const disposeRuntime = useCallback(() => {
    // Dispose subscription manager first (it unsubscribes from the runtime)
    if (currentSubManagerRef.current) {
      currentSubManagerRef.current.dispose();
      currentSubManagerRef.current = null;
    }
    setSubscriptionManager(null);

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

      // Dispose old subscription manager first
      if (currentSubManagerRef.current) {
        currentSubManagerRef.current.dispose();
        currentSubManagerRef.current = null;
      }

      // Now do a single atomic state update that disposes old and sets new
      setRuntime(currentRuntime => {
        if (currentRuntime) {
          try {
            factoryRef.current.disposeRuntime(currentRuntime);
          } catch (err) {
            console.error('[RuntimeProvider] Error disposing existing runtime:', err);
          }
        }
        return newRuntime;
      });

      if (newRuntime) {
        currentRuntimeRef.current = newRuntime;
        // Create a SubscriptionManager and add a local subscription
        const mgr = new SubscriptionManager(newRuntime);
        mgr.add(new LocalRuntimeSubscription({ id: 'local' }));
        currentSubManagerRef.current = mgr;
        setSubscriptionManager(mgr);
      } else {
        currentRuntimeRef.current = null;
        currentSubManagerRef.current = null;
        setSubscriptionManager(null);
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
      // Dispose subscription manager first
      if (currentSubManagerRef.current) {
        currentSubManagerRef.current.dispose();
      }
      // Use ref to get current runtime value, avoiding stale closure
      if (currentRuntimeRef.current) {
        try {
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
      <SubscriptionManagerContext.Provider value={subscriptionManager}>
        {children}
      </SubscriptionManagerContext.Provider>
    </RuntimeLifecycleContext.Provider>
  );
};

export default RuntimeLifecycleProvider;
