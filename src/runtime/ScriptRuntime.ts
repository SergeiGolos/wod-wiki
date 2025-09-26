import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IRuntimeEvent, IEventHandler } from './EventHandler';
import { IRuntimeAction } from './IRuntimeAction';
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeMemory } from './RuntimeMemory';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export class ScriptRuntime implements IScriptRuntime {
    public readonly stack: RuntimeStack;
    public readonly jit: JitCompiler;
    public readonly memory: IRuntimeMemory;
    private _lastUpdatedBlocks: Set<string> = new Set();
    
    constructor(public readonly script: WodScript, compiler: JitCompiler) {
        this.stack = new RuntimeStack();
        this.memory = new RuntimeMemory();
        this.jit = compiler;
        this._setupMemoryAwareStack();
        console.log(`🧠 ScriptRuntime created with memory system`);
    }
    options?: { emitTags?: boolean; } | undefined;

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
                console.log(`🧠 ScriptRuntime - Popping block: ${poppedBlock.key.toString()}`);
                const resp = poppedBlock.pop();
                if (Array.isArray(resp)) {
                    for (const log of resp as any[]) {
                        console.log(`[pop]`, log);
                    }
                }
            }

            return poppedBlock;
        };

        this.stack.push = (block) => {
            console.log(`🧠 ScriptRuntime - Pushing block: ${block.key.toString()}`);
            
            // Optionally allow blocks that expose setRuntime to receive runtime context (duck-typing)
            if (typeof (block as any).setRuntime === 'function') {
                (block as any).setRuntime(this);
            }
            
            const eventsOrLogs = block.push();
            originalPush(block);

            // Handle any events emitted during push
            if (Array.isArray(eventsOrLogs) && eventsOrLogs.length > 0) {
                const first = eventsOrLogs[0] as any;
                if (first && typeof first.name === 'string') {
                    for (const event of eventsOrLogs as any[]) this.handle(event);
                } else {
                    for (const log of eventsOrLogs as any[]) console.log(`[push]`, log);
                }
            }
        };
    }

    handle(event: IRuntimeEvent): void {
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

            const response = handler.handler(event, this);
            console.log(`      ✅ Response - handled: ${response.handled}, abort: ${response.abort}, actions: ${response.actions.length}`);

            if (response.handled) {
                allActions.push(...response.actions);
                console.log(`      📦 Added ${response.actions.length} actions to queue`);
            }
            if (response.abort) {
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
    
    tick(): IRuntimeEvent[] {
        console.log(`⏰ ScriptRuntime.tick() - Processing current block lifecycle`);

        const currentBlock = this.stack.current;
        if (!currentBlock) {
            console.log(`  ❌ No current block to process`);
            return [];
        }

        console.log(`  🎯 Current block: ${currentBlock.key.toString()}`);

        // In the new Push/Next/Pop pattern, we might emit timer events or check for completion
        // For now, we'll emit a generic tick event that blocks can handle
        const tickEvent: IRuntimeEvent = {
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
