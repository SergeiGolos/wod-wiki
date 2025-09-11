import { ScriptRuntime } from './ScriptRuntime';
import { IScriptRuntimeWithMemory } from './IScriptRuntimeWithMemory';
import type { IRuntimeMemory, IDebugMemoryView } from './memory';
import { RuntimeMemory } from './memory';
import { WodScript } from '../WodScript';
import { JitCompiler } from './JitCompiler';
import { IRuntimeEvent } from './EventHandler';

/**
 * Script runtime implementation with memory separation support.
 * This completely replaces the old ScriptRuntime for all blocks.
 */
export class ScriptRuntimeWithMemory extends ScriptRuntime implements IScriptRuntimeWithMemory {
    private _memory: RuntimeMemory;

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
     * Enhanced stack management with automatic memory cleanup and runtime setup
     */
    private _setupMemoryAwareStack(): void {
        // Override stack operations to handle memory setup and cleanup
        const originalPop = this.stack.pop.bind(this.stack);
        const originalPush = this.stack.push.bind(this.stack);
        
        this.stack.pop = () => {
            const poppedBlock = originalPop();
            
            if (poppedBlock) {
                console.log(`🧠 ScriptRuntimeWithMemory - Cleaning up memory for popped block: ${poppedBlock.key.toString()}`);
                poppedBlock.cleanupMemory();
            }
            
            return poppedBlock;
        };

        this.stack.push = (block) => {
            // Set up the runtime context for all blocks
            block.setRuntime(this);
            originalPush(block);
            console.log(`🧠 ScriptRuntimeWithMemory - Set up runtime context for block: ${block.key.toString()}`);
        };
    }

    /**
     * Override handle to work with memory-based handlers
     */
    handle(event: IRuntimeEvent): void {
        console.log(`🎯 ScriptRuntimeWithMemory.handle() - Processing event: ${event.name}`);
        console.log(`  📚 Stack depth: ${this.stack.blocks.length}`);
        console.log(`  🎯 Current block: ${this.stack.current?.key?.toString() || 'None'}`);
        
        const allActions: import('./EventHandler').IRuntimeAction[] = [];
        const handlers = this.stack.current?.getHandlers() ?? [];

        console.log(`  🔍 Found ${handlers.length} handlers on current block`);
        
        for (let i = 0; i < handlers.length; i++) {
            const handler = handlers[i];
            console.log(`    🔧 Handler ${i + 1}/${handlers.length}: ${handler.name} (${handler.id})`);
            
            const response = handler.handleEvent(event, this);
            console.log(`      ✅ Response - handled: ${response.handled}, shouldContinue: ${response.shouldContinue}, actions: ${response.actions.length}`);
            
            if (response.handled) {
                allActions.push(...response.actions);
                console.log(`      📦 Added ${response.actions.length} actions to queue`);
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