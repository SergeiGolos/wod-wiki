import { ScriptRuntime } from './ScriptRuntime';
import { IScriptRuntimeWithMemory } from './IScriptRuntimeWithMemory';
import type { IRuntimeMemory, IDebugMemoryView } from './memory';
import { RuntimeMemory } from './memory';
import { WodScript } from '../WodScript';
import { JitCompiler } from './JitCompiler';
import { IRuntimeEvent, IEventHandler } from './EventHandler';

/**
 * Script runtime implementation with memory separation support.
 * This completely replaces the old ScriptRuntime for all blocks.
 */
export class ScriptRuntimeWithMemory extends ScriptRuntime implements IScriptRuntimeWithMemory {
    private _memory: RuntimeMemory;
    private _lastUpdatedBlocks: Set<string> = new Set();

    constructor(script: WodScript, compiler: JitCompiler) {
        super(script, compiler);
        this._memory = new RuntimeMemory();
        this._setupMemoryAwareStack();
        console.log(`🧠 ScriptRuntimeWithMemory created with memory system`);
    }

    get memory(): IRuntimeMemory {
        return this._memory;
    }

    get debugMemory(): IDebugMemoryView {
        return this._memory.getDebugView();
    }

    /**
     * Enhanced stack management with automatic memory cleanup and push/pop lifecycle
     */
    private _setupMemoryAwareStack(): void {
        // Override stack operations to handle push/pop lifecycle
        const originalPop = this.stack.pop.bind(this.stack);
        const originalPush = this.stack.push.bind(this.stack);

        this.stack.pop = () => {
            const poppedBlock = originalPop();

            if (poppedBlock) {
                console.log(`🧠 ScriptRuntimeWithMemory - Popping block: ${poppedBlock.key.toString()}`);
                poppedBlock.pop(this.memory);
            }

            return poppedBlock;
        };

        this.stack.push = (block) => {
            console.log(`🧠 ScriptRuntimeWithMemory - Pushing block: ${block.key.toString()}`);
            
            // Set runtime context for memory-aware blocks
            if (block.setRuntime) {
                block.setRuntime(this);
            }
            
            const events = block.push(this.memory);
            originalPush(block);

            // Handle any events emitted during push
            for (const event of events) {
                this.handle(event);
            }
        };
    }

    /**
     * Override handle to work with memory-based handlers
     * UNIFIED EVENT PROCESSING: Events are processed against ALL handlers in memory
     */
    handle(event: IRuntimeEvent): void {
        console.log(`🎯 ScriptRuntimeWithMemory.handle() - Processing event: ${event.name}`);
        console.log(`  📚 Stack depth: ${this.stack.blocks.length}`);
        console.log(`  🎯 Current block: ${this.stack.current?.key?.toString() || 'None'}`);

        const allActions: import('./EventHandler').IRuntimeAction[] = [];
        const updatedBlocks = new Set<string>();

        // UNIFIED HANDLER PROCESSING: Get ALL handlers from memory (not just current block)
        const allHandlers = this.memory.searchReferences<IEventHandler>({ type: 'handler' })
            .map(ref => ref.get())
            .filter(Boolean) as IEventHandler[];

        console.log(`  🔍 Found ${allHandlers.length} handlers across ALL blocks in memory`);

        // Process ALL handlers in memory, tracking which blocks are updated
        for (let i = 0; i < allHandlers.length; i++) {
            const handler = allHandlers[i];
            
            // Find the owner of this handler to track updates
            let handlerOwnerId: string | undefined;
            for (const [ownerId, refIds] of (this.memory as any)._ownerIndex.entries()) {
                const handlerRef = this.memory.searchReferences<IEventHandler>({ ownerId, type: 'handler' })
                    .find(ref => ref.get() === handler);
                if (handlerRef) {
                    handlerOwnerId = ownerId;
                    break;
                }
            }
            
            console.log(`    🔧 Handler ${i + 1}/${allHandlers.length}: ${handler.name} (${handler.id}) from block: ${handlerOwnerId || 'unknown'}`);

            const response = handler.handler(event, this);
            console.log(`      ✅ Response - handled: ${response.handled}, shouldContinue: ${response.shouldContinue}, actions: ${response.actions.length}`);

            if (response.handled) {
                allActions.push(...response.actions);
                console.log(`      📦 Added ${response.actions.length} actions to queue`);
                
                // Track which block was updated
                if (handlerOwnerId) {
                    updatedBlocks.add(handlerOwnerId);
                }
            }
            if (!response.shouldContinue) {
                console.log(`      🛑 Handler requested stop - breaking execution chain`);
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
        
        console.log(`🏁 ScriptRuntimeWithMemory.handle() completed for event: ${event.name}`);
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