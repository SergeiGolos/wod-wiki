import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IRuntimeEvent } from './EventHandler';

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

    public tick(): void {
        const currentBlock = this.stack.current;
        if (!currentBlock) {
            console.warn('No current block to execute');
            return;
        }

        if (false) {
            this.handle({
                name: 'block-completed',
                timestamp: Date.now(),
            });
        }
    }
}
