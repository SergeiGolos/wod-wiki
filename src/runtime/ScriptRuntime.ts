import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IRuntimeEvent, EventHandler } from './EventHandler';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export class ScriptRuntime implements IScriptRuntime {
    public readonly stack: RuntimeStack;
    public readonly jit: JitCompiler;
    
    constructor(public readonly script: WodScript) {
        this.stack = new RuntimeStack();
        this.jit = new JitCompiler(script);
    }

    handle(event: IRuntimeEvent): void {                
        var handlres = this.stack.blocks.flatMap(block => block.handlers)
        var actions = handlres.find(handler => handler.canHandle(event))?.handle(event) ?? [];         
        for (const action of actions) {
            console.log('Applying action:', action, 'from source:', event);
            action.do(this);
        }        
    }
    
    tick(): IRuntimeEvent[] {        
        const events = this.stack.current?.tick() ?? [];
        if (events.length > 0) {
            console.log('Tick events:', events);
            for (var event of events) { 
                this.handle(event);
            }
        } 
        return [];
    }
}
