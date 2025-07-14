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
        const allActions: IRuntimeAction[] = [];
        const handlers = this.stack.blocks.flatMap(block => block.handlers);

        for (const handler of handlers) {
            const response = handler.handleEvent(event);
            if (response.handled) {
                allActions.push(...response.actions);
            }
            if (!response.shouldContinue) {
                break; // Stop processing if a handler says so
            }
        }

        for (const action of allActions) {
            action.do(this);
        }
    }
    
    tick(): IRuntimeEvent[] {        
        const events = this.stack.current?.tick() ?? [];
        if (events.length > 0) {
            console.log('Tick events:', events);
            for (const event of events) {
                this.handle(event);
            }
        } 
        return [];
    }
}
