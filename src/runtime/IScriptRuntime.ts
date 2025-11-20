import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeError } from './actions/ErrorAction';
import { IMetricCollector } from './MetricCollector';

export interface IScriptRuntime {
    readonly script: WodScript;
    readonly memory: IRuntimeMemory;
    readonly stack: RuntimeStack;
    readonly jit: JitCompiler;
    
    /** Errors collected during runtime execution */
    readonly errors?: RuntimeError[];
    
    /** Metrics collection subsystem for workout analytics */
    readonly metrics?: IMetricCollector;
    
    handle(event: IEvent): void;
}
