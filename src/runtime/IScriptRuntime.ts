import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeError } from './actions/ErrorAction';
import { ExecutionSpan } from './models/ExecutionSpan';
import { ExecutionTracker } from './ExecutionTracker';

import { RuntimeClock } from './RuntimeClock';
import { EventBus } from './EventBus';

export interface IScriptRuntime {
    readonly script: WodScript;
    
    readonly eventBus: EventBus;
    readonly memory: IRuntimeMemory;
    readonly stack: RuntimeStack;
    
    readonly jit: JitCompiler;
    readonly clock: RuntimeClock;
    
    /** Errors collected during runtime execution */
    readonly errors?: RuntimeError[];
    
    /** 
     * ExecutionTracker for recording metrics to active spans.
     * Use this to record metrics, start/end segments, etc.
     */
    readonly tracker: ExecutionTracker;

    /** Persistent log of completed execution spans */
    readonly executionLog: ExecutionSpan[];
    
    /**
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty and execution has finished.
     */
    isComplete(): boolean;

    handle(event: IEvent): void;
}
