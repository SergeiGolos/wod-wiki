import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
import { IEventHandler } from "./IEventHandler";
import { IRuntimeAction } from './IRuntimeAction';
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeMemory } from './RuntimeMemory';
import type { RuntimeError } from './actions/ErrorAction';
import { IMetricCollector, MetricCollector } from './MetricCollector';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export class ScriptRuntime implements IScriptRuntime {
    public readonly stack: RuntimeStack;
    public readonly jit: JitCompiler;
    public readonly memory: IRuntimeMemory;
    public readonly metrics: IMetricCollector;
    public readonly errors: RuntimeError[] = [];
    private _lastUpdatedBlocks: Set<string> = new Set();
    
    constructor(public readonly script: WodScript, compiler: JitCompiler) {
        this.stack = new RuntimeStack();
        this.memory = new RuntimeMemory();
        this.metrics = new MetricCollector();
        this.jit = compiler;
        this._setupMemoryAwareStack();
        console.log(`🧠 ScriptRuntime created with memory system and metrics collector`);
    }

    /**
     * Enhanced stack management with constructor-based initialization and consumer-managed disposal.
     * Updated to support the new lifecycle pattern where:
     * - Initialization happens in block constructors (not during push)
     * - Cleanup happens via consumer-managed dispose() calls (not during pop)
     */
    private _setupMemoryAwareStack(): void {
        // Override stack operations for logging and runtime context setup only
        const originalPop = this.stack.pop.bind(this.stack);
        const originalPush = this.stack.push.bind(this.stack);

        this.stack.pop = () => {
            const poppedBlock = originalPop();

            if (poppedBlock) {
                console.log(`🧠 ScriptRuntime - Popped block: ${poppedBlock.key.toString()}`);
                console.log(`  ⚠️  Consumer must call dispose() on this block when finished`);
            }

            return poppedBlock; // Consumer responsibility to dispose
        };

        this.stack.push = (block) => {
            console.log(`🧠 ScriptRuntime - Pushing block: ${block.key.toString()}`);
            
            // Optionally allow blocks that expose setRuntime to receive runtime context (duck-typing)
            if (typeof (block as any).setRuntime === 'function') {
                (block as any).setRuntime(this);
            }
            
            // Push block (no lifecycle method calls - constructor-based initialization)
            originalPush(block);
            
            console.log(`  ✅ Block pushed with constructor-based initialization`);
        };
    }

    handle(event: IEvent): void {
        console.log(`🎯 ScriptRuntime.handle() - Processing event: ${event.name}`);
        console.log(`  📚 Stack depth: ${this.stack.blocks.length}`);
        console.log(`  🎯 Current block: ${this.stack.current?.key?.toString() || 'None'}`);

        const allActions: IRuntimeAction[] = [];
        const updatedBlocks = new Set<string>();

        // UNIFIED HANDLER PROCESSING: Get ALL handlers from memory (not just current block)
        const handlerRefs = this.memory.search({ type: 'handler', id: null, ownerId: null, visibility: null });
        const allHandlers = handlerRefs
            .map(ref => this.memory.get(ref as any))
            .filter(Boolean) as IEventHandler[];

        console.log(`  🔍 Found ${allHandlers.length} handlers across ALL blocks in memory`);

        // Process ALL handlers in memory
        for (let i = 0; i < allHandlers.length; i++) {
            const handler = allHandlers[i];
            
            console.log(`    🔧 Handler ${i + 1}/${allHandlers.length}: ${handler.name} (${handler.id})`);

            const actions = handler.handler(event, this);
            console.log(`      ✅ Returned ${actions.length} action(s)`);

            if (actions.length > 0) {
                allActions.push(...actions);
                console.log(`      📦 Added ${actions.length} action(s) to queue`);
            }
            
            // Check for errors - if runtime has errors, abort further processing
            if (this.errors && this.errors.length > 0) {
                console.log(`      🛑 Runtime has errors - aborting handler chain`);
                break;
            }
        }

        console.log(`  🎬 Executing ${allActions.length} actions:`);
        for (let i = 0; i < allActions.length; i++) {
            const action = allActions[i];
            console.log(`    ⚡ Action ${i + 1}/${allActions.length}: ${action.type}`);
            action.do(this);
            console.log(`    ✨ Action ${action.type} completed`);
        }
        
        console.log(`🏁 ScriptRuntime.handle() completed for event: ${event.name}`);
        console.log(`  📊 Final stack depth: ${this.stack.blocks.length}`);
        console.log(`  🎯 Final current block: ${this.stack.current?.key?.toString() || 'None'}`);
        console.log(`  🔄 Updated blocks: [${Array.from(updatedBlocks).join(', ')}]`);
        
        // Store updated blocks for consumers to query
        this._lastUpdatedBlocks = updatedBlocks;
    }
    
    /**
     * Gets the blocks that were updated during the last event processing.
     * This allows consumers to make decisions about what state needs to be updated in the UI.
     */
    public getLastUpdatedBlocks(): string[] {
        return Array.from(this._lastUpdatedBlocks);
    }

    /**
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty.
     * Note: A fresh runtime starts with an empty stack, so this will return true
     * until a block is pushed. Consumers should ensure the runtime is initialized
     * with a root block before checking completion.
     */
    public isComplete(): boolean {
        return this.stack.blocks.length === 0;
    }

    /**
     * Helper method to safely pop and dispose a block following the new lifecycle pattern.
     * This demonstrates the consumer-managed dispose pattern.
     */
    public popAndDispose(): void {
        const poppedBlock = this.stack.pop();
        
        if (poppedBlock) {
            console.log(`🧠 ScriptRuntime.popAndDispose() - Disposing block: ${poppedBlock.key.toString()}`);
            
            // Consumer responsibility: call dispose() on the popped block
            try {
                poppedBlock.dispose(this);
                console.log(`  ✅ Block disposed successfully`);
            } catch (error) {
                console.error(`  ❌ Error disposing block: ${error}`);
                // Continue execution despite dispose error
            }
        } else {
            console.log(`🧠 ScriptRuntime.popAndDispose() - No block to pop`);
        }
    }

    /**
     * Emergency cleanup method that disposes all blocks in the stack.
     * Useful for shutdown or error recovery scenarios.
     */
    public disposeAllBlocks(): void {
        console.log(`🧠 ScriptRuntime.disposeAllBlocks() - Cleaning up ${this.stack.blocks.length} blocks`);
        
        const disposeErrors: Error[] = [];
        
        while (this.stack.blocks.length > 0) {
            const block = this.stack.pop();
            if (block) {
                try {
                    block.dispose(this);
                    console.log(`  ✅ Disposed: ${block.key.toString()}`);
                } catch (error) {
                    disposeErrors.push(error as Error);
                    console.error(`  ❌ Error disposing ${block.key.toString()}: ${error}`);
                }
            }
        }
        
        if (disposeErrors.length > 0) {
            console.warn(`🧠 ScriptRuntime.disposeAllBlocks() - ${disposeErrors.length} dispose errors occurred`);
        } else {
            console.log(`🧠 ScriptRuntime.disposeAllBlocks() - All blocks disposed successfully`);
        }
    }
    
    tick(): IEvent[] {
        console.log(`⏰ ScriptRuntime.tick() - Processing current block lifecycle`);

        const currentBlock = this.stack.current;
        if (!currentBlock) {
            console.log(`  ❌ No current block to process`);
            return [];
        }

        console.log(`  🎯 Current block: ${currentBlock.key.toString()}`);

        // In the new Push/Next/Pop pattern, we might emit timer events or check for completion
        // For now, we'll emit a generic tick event that blocks can handle
        const tickEvent: IEvent = {
            name: 'tick',
            timestamp: new Date(),
            data: { source: 'runtime' }
        };

        console.log(`  📤 Emitting tick event`);
        this.handle(tickEvent);

        console.log(`⏰ ScriptRuntime.tick() completed`);
        return [];
    }
}
