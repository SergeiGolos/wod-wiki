import { ScriptRuntime } from './ScriptRuntime';

/**
 * ScriptRuntimeWithMemory is an alias for ScriptRuntime.
 * The base ScriptRuntime class already includes full memory functionality:
 * - Memory system integration (IRuntimeMemory, RuntimeMemory)
 * - Debug memory view (getMemorySnapshot(), getMemoryHierarchy())
 * - Memory-aware stack management
 * 
 * This class exists for backward compatibility and semantic clarity
 * in contexts where memory functionality is explicitly required.
 */
export class ScriptRuntimeWithMemory extends ScriptRuntime {
    // All functionality is inherited from ScriptRuntime
    // No additional implementation needed
}

// Also export as default for convenience
export default ScriptRuntimeWithMemory;