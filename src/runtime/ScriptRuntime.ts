import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IRuntimeEvent } from './EventHandler';
import { Subject } from 'rxjs';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export class ScriptRuntime implements IScriptRuntime {
    public readonly stack: RuntimeStack;
    public readonly jit: JitCompiler;
    public readonly tick$: Subject<RuntimeState>;
    public state: RuntimeState = 'idle';

    constructor(public readonly script: WodScript) {
        this.stack = new RuntimeStack();
        this.jit = new JitCompiler(script);
        this.tick$ = new Subject<RuntimeState>();
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
        if (this.jit.isCompiling) {
            this.state = 'compiling';
        } else if (this.stack.blocks.length === 1 && this.stack.current?.key?.blockId === 'root') {
            this.state = 'idle';
        } else if (this.stack.blocks.length === 0) {
            this.state = 'completed';
        } else {
            this.state = 'running';
        }

        this.tick$.next(this.state);
    }
}
