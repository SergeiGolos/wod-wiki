import { ScriptRuntime } from './ScriptRuntime';
import { IScriptRuntimeWithMemory } from './IScriptRuntimeWithMemory';
import { IRuntimeMemory, IDebugMemoryView, RuntimeMemory } from './memory';
import { IRuntimeBlockWithMemory } from './IRuntimeBlockWithMemory';
import { RuntimeBlockWithMemoryBase } from './RuntimeBlockWithMemoryBase';
import { WodScript } from '../WodScript';
import { JitCompiler } from './JitCompiler';
import { IRuntimeEvent } from './EventHandler';

/**
 * Script runtime implementation with memory separation support.
 * Extends the base ScriptRuntime to add memory management capabilities.
 */
export class ScriptRuntimeWithMemory extends ScriptRuntime implements IScriptRuntimeWithMemory {
    private _memory: RuntimeMemory;

    constructor(script: WodScript, compiler: JitCompiler) {
        super(script, compiler);
        this._memory = new RuntimeMemory();
        console.log(`🧠 ScriptRuntimeWithMemory created with separate memory system`);
    }

    get memory(): IRuntimeMemory {
        return this._memory;
    }

    get debugMemory(): IDebugMemoryView {
        return this._memory;
    }

    /**
     * Override handle to support memory-aware blocks
     */
    handle(event: IRuntimeEvent): void {
        // Call parent implementation
        super.handle(event);
        
        // Additional memory-specific handling can be added here if needed
    }

    /**
     * Enhanced stack management with automatic memory cleanup
     */
    private _setupMemoryAwareStack(): void {
        // Override stack operations to handle memory cleanup
        const originalPop = this.stack.pop.bind(this.stack);
        
        this.stack.pop = () => {
            const poppedBlock = originalPop();
            
            if (poppedBlock) {
                console.log(`🧠 ScriptRuntimeWithMemory - Cleaning up memory for popped block: ${poppedBlock.key.toString()}`);
                
                // If the block supports memory, clean it up
                if (this._isMemoryAwareBlock(poppedBlock)) {
                    poppedBlock.cleanupMemory();
                } else {
                    // For blocks that don't extend RuntimeBlockWithMemoryBase,
                    // clean up any memory they might have allocated by owner ID
                    const ownerId = poppedBlock.key.toString();
                    const memoryRefs = this._memory.getByOwner(ownerId);
                    for (const memRef of memoryRefs) {
                        this._memory.release(memRef);
                    }
                }
            }
            
            return poppedBlock;
        };

        const originalPush = this.stack.push.bind(this.stack);
        
        this.stack.push = (block) => {
            // If the block supports memory, set up the runtime context
            if (this._isMemoryAwareBlock(block)) {
                block.setRuntime(this);
            }
            
            originalPush(block);
        };
    }

    private _isMemoryAwareBlock(block: any): block is RuntimeBlockWithMemoryBase {
        return block && typeof block.setRuntime === 'function' && typeof block.cleanupMemory === 'function';
    }

    /**
     * Initialize the memory-aware stack management
     */
    public initialize(): void {
        this._setupMemoryAwareStack();
        console.log(`🧠 ScriptRuntimeWithMemory initialized with memory-aware stack management`);
    }

    /**
     * Gets a debug snapshot of the current memory state
     */
    public getMemorySnapshot() {
        return this._memory.getMemorySnapshot();
    }

    /**
     * Gets memory hierarchy for debugging
     */
    public getMemoryHierarchy() {
        return this._memory.getMemoryHierarchy();
    }
}