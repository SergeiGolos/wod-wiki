import { IRuntimeBlock } from './IRuntimeBlock';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IRuntimeEvent } from './EventHandler';

export interface IScriptRuntime {
    readonly script: WodScript;
    readonly stack: RuntimeStack;
    readonly jit: JitCompiler;
    readonly options?: {
        /** When true, fragment compilers may emit non-quantitative tag metrics (e.g., action/effort). */
        emitTags?: boolean;
    };

    handle(event: IRuntimeEvent): void;
}
