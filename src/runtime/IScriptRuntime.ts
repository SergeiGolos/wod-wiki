import { IRuntimeBlock } from './IRuntimeBlock';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IRuntimeEvent } from './EventHandler';

export interface IScriptRuntime {
    readonly script: WodScript;
    readonly stack: RuntimeStack;
    readonly jit: JitCompiler;

    handle(event: IRuntimeEvent): void;
}
