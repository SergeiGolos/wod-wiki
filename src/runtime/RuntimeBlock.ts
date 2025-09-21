import type { IMemoryReference } from './memory';
import { IResultSpanBuilder } from './ResultSpanBuilder';
import { IRuntimeLog } from './EventHandler';
import { BlockKey } from '../BlockKey';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IBehavior } from './IBehavior';
import { RuntimeMetric } from './RuntimeMetric';

/**
 * Base implementation for runtime blocks using the new Push/Next/Pop pattern.
 * All blocks extend this class and are based on behaviors with access to memory.
 * Combines functionality from BehavioralMemoryBlockBase and RuntimeBlockWithMemoryBase.
 */
export abstract class RuntimeBlock implements IRuntimeBlock {
    public readonly sourceId: string[];
    
    // Memory references for core runtime state
    protected _spansRef?: IMemoryReference<IResultSpanBuilder>;
    // Handlers and metrics are now stored as individual memory entries ('handler' and 'metric').

    constructor(public readonly key: BlockKey, protected initialMetrics: RuntimeMetric[] = [], public readonly behaviors: IBehavior[] = []) {
        // Derive source ids from initial metrics (unique, preserve insertion order)
        const ids = Array.from(new Set(initialMetrics.map(m => m.sourceId)));
        this.sourceId = ids;
        console.log(`🧠 RuntimeBlock created: ${key.toString()}`);
    }
    
    /**
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     */
    push(runtime: IScriptRuntime): IRuntimeLog[] {
        
    }

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     */
    next(runtime: IScriptRuntime): IRuntimeLog[] {
        return this.onNext(runtime);
    }

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     */
    pop(runtime: IScriptRuntime): IRuntimeLog[] {
        
    }    
}