import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeMemory, IDebugMemoryView } from './memory';

/**
 * Extended script runtime interface that supports memory separation.
 * This allows for independent debugging and state inspection.
 */
export interface IScriptRuntimeWithMemory extends IScriptRuntime {
    /** The separate memory system for runtime state */
    readonly memory: IRuntimeMemory;
    
    /** Debug interface for inspecting memory state */
    readonly debugMemory: IDebugMemoryView;
}