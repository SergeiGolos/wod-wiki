import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../WodScript';
import { IRuntimeEvent } from './EventHandler';
import { IRuntimeMemory } from './memory';
import type { IDebugMemoryView } from './memory';

export interface IScriptRuntime {
    readonly script: WodScript;
    readonly memory: IRuntimeMemory;
    readonly stack: RuntimeStack;
    readonly jit: JitCompiler;
    
    /** Debug interface for inspecting memory state */
    readonly debugMemory: IDebugMemoryView;
    
    handle(event: IRuntimeEvent): void;
}
