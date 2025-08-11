import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IRuntimeEvent, EventHandler, IRuntimeAction } from './EventHandler';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export class ScriptRuntime implements IScriptRuntime {
    public readonly stack: RuntimeStack;
    public readonly jit: JitCompiler;
    
    constructor(public readonly script: WodScript, compiler: JitCompiler) {
        this.stack = new RuntimeStack();
        this.jit = compiler;
    }

    handle(event: IRuntimeEvent): void {                
        console.log(`🎯 ScriptRuntime.handle() - Processing event: ${event.name}`);
        console.log(`  📚 Stack depth: ${this.stack.blocks.length}`);
        console.log(`  🎯 Current block: ${this.stack.current?.key?.toString() || 'None'}`);
        
        const allActions: IRuntimeAction[] = [];
        const handlers = this.stack?.blocks.flatMap(block => block.handlers) ?? [];

        event.runtime = this;

        console.log(`  🔍 Found ${handlers.length} handlers across ${this.stack.blocks.length} blocks`);
        
        for (let i = 0; i < handlers.length; i++) {
            const handler = handlers[i];
            console.log(`    🔧 Handler ${i + 1}/${handlers.length}: ${handler.name} (${handler.id})`);
            
            const response = handler.handleEvent(event);
            console.log(`      ✅ Response - handled: ${response.handled}, shouldContinue: ${response.shouldContinue}, actions: ${response.actions.length}`);
            
            if (response.handled) {
                allActions.push(...response.actions);
                console.log(`      📦 Added ${response.actions.length} actions to queue`);
            }
            if (!response.shouldContinue) {
                console.log(`      🛑 Handler requested stop - breaking execution chain`);
                break; // Stop processing if a handler says so
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
    }
    
    tick(): IRuntimeEvent[] {        
        console.log(`⏰ ScriptRuntime.tick() - Getting tick events from current block`);
        const events = this.stack.current?.tick() ?? [];
        console.log(`  📨 Current block returned ${events.length} events`);
        
        if (events.length > 0) {
            console.log(`  🔄 Processing ${events.length} tick events:`);
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                console.log(`    📧 Event ${i + 1}/${events.length}: ${event.name}`);
                this.handle(event);
            }
        } else {
            console.log(`  💤 No tick events to process`);
        }
        
        console.log(`⏰ ScriptRuntime.tick() completed`);
        return [];
    }
}
