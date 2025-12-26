import { JitCompiler } from './JitCompiler';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeError } from './actions/ErrorAction';

import { RuntimeReporter } from '../tracker/ExecutionTracker';

import { IEventBus } from './IEventBus';
import { IRuntimeStack } from './IRuntimeStack';
import { IRuntimeClock } from './IRuntimeClock';
import { BlockLifecycleOptions, IRuntimeBlock } from './IRuntimeBlock';

export interface IScriptRuntime {
    readonly script: WodScript;

    readonly eventBus: IEventBus;
    readonly memory: IRuntimeMemory;
    readonly stack: IRuntimeStack;

    readonly jit: JitCompiler;
    readonly clock: IRuntimeClock;

    /** Errors collected during runtime execution */
    readonly errors?: RuntimeError[];

    /** 
     * RuntimeReporter for recording metrics to active spans.
     * Use this to record metrics, start/end segments, etc.
     */
    readonly tracker: RuntimeReporter;

    /**
     * Pushes a block onto the runtime stack, handling all lifecycle operations.
     * Returns the actual block pushed onto the stack (potentially wrapped).
     */
    pushBlock(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeBlock;

    /**
     * Pops a block from the runtime stack, handling all lifecycle operations.
     */
    popBlock(options?: BlockLifecycleOptions): IRuntimeBlock | undefined;

    /**
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty and execution has finished.
     */
    isComplete(): boolean;

    handle(event: IEvent): void;
}
