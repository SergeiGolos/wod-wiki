import { IScriptRuntime } from './IScriptRuntime';
import type { IDebugMemoryView } from './memory';

/**
 * Extended script runtime interface that supports memory separation.
 * This allows for independent debugging and state inspection.
 */
export interface IScriptRuntimeWithMemory extends IScriptRuntime {    
    /** Debug interface for inspecting memory state */
    readonly debugMemory: IDebugMemoryView;
}