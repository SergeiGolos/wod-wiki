/**
 * useRuntimeLifecycle hook - Access runtime lifecycle context from child components
 * 
 * This hook provides access to the full runtime lifecycle (creation, disposal, error tracking).
 * For accessing a pre-created IScriptRuntime instance, use useScriptRuntime() instead.
 */

import { useContext } from 'react';
import { RuntimeLifecycleContext, type RuntimeLifecycleState } from './RuntimeContext';

/**
 * Hook to access runtime lifecycle context
 * @throws Error if used outside RuntimeLifecycleProvider
 */
export const useRuntimeLifecycle = (): RuntimeLifecycleState => {
  const context = useContext(RuntimeLifecycleContext);
  if (!context) {
    throw new Error('useRuntimeLifecycle must be used within a RuntimeLifecycleProvider');
  }
  return context;
};

/** @deprecated Use useRuntimeLifecycle instead */
export const useRuntime = useRuntimeLifecycle;
