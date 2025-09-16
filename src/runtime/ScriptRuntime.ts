import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IRuntimeEvent } from './EventHandler';

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

        // Base implementation - subclasses should override for specific handler logic
        console.log(`  � Base ScriptRuntime.handle() - no specific handling implemented`);
        console.log(`🏁 ScriptRuntime.handle() completed for event: ${event.name}`);
    }
    
    tick(): IRuntimeEvent[] {
        console.log(`⏰ ScriptRuntime.tick() - Processing current block lifecycle`);

        const currentBlock = this.stack.current;
        if (!currentBlock) {
            console.log(`  � No current block to process`);
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

        console.log(`  � Emitting tick event`);
        this.handle(tickEvent);

        console.log(`⏰ ScriptRuntime.tick() completed`);
        return [];
    }
}
