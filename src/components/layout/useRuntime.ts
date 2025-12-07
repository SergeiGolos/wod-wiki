/**
 * useRuntime hook - Access runtime context from child components
 */

import { useContext } from 'react';
import { RuntimeContext, type RuntimeContextState } from './RuntimeContext';

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
