/**
 * RuntimeContext - Shared context definition for runtime management
 */

import { createContext } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import type { WodBlock } from '../../markdown-editor/types';

/**
 * Runtime context state interface
 */
export interface RuntimeContextState {
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

export const RuntimeContext = createContext<RuntimeContextState | undefined>(undefined);
