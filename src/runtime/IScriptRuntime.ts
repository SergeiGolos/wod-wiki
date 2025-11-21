import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeError } from './actions/ErrorAction';
import { IMetricCollector } from './MetricCollector';
import { ExecutionRecord } from './models/ExecutionRecord';

export interface IScriptRuntime {
    readonly script: WodScript;
    readonly memory: IRuntimeMemory;
    readonly stack: RuntimeStack;
    readonly jit: JitCompiler;
    
    /** Errors collected during runtime execution */
    readonly errors?: RuntimeError[];
    
    /** Metrics collection subsystem for workout analytics */
    readonly metrics?: IMetricCollector;

    /** Persistent log of executed blocks */
    readonly executionLog: ExecutionRecord[];
    
    /**
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty and execution has finished.
     */
    isComplete(): boolean;

    handle(event: IEvent): void;
}
