import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IEvent } from "./IEvent";
import { IRuntimeMemory } from './IRuntimeMemory';

export interface IScriptRuntime {
    readonly script: WodScript;
    readonly memory: IRuntimeMemory;
    readonly stack: RuntimeStack;
    readonly jit: JitCompiler;
    
    handle(event: IEvent): void;
}
