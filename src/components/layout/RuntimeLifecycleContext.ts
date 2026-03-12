/**
 * RuntimeLifecycleContext - Shared context definition for runtime lifecycle management
 * 
 * This context manages the full lifecycle of ScriptRuntime instances:
 * creation, initialization, disposal, and error tracking.
 * 
 * For simple runtime injection (passing a pre-created IScriptRuntime to children),
 * use ScriptRuntimeContext from '@/runtime/context/RuntimeContext' instead.
 */

import { createContext } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import type { WodBlock } from '../Editor/types';

/**
 * Runtime lifecycle context state interface
 */
export interface RuntimeLifecycleState {
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

export const RuntimeLifecycleContext = createContext<RuntimeLifecycleState | undefined>(undefined);

