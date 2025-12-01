import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
import { IEventHandler } from "./IEventHandler";
import { IRuntimeAction } from './IRuntimeAction';
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeMemory } from './RuntimeMemory';
import type { RuntimeError } from './actions/ErrorAction';
import { IMetricCollector, MetricCollector } from './MetricCollector';
import { ExecutionRecord } from './models/ExecutionRecord';
import { FragmentCompilationManager } from './FragmentCompilationManager';
import { MemoryAwareRuntimeStack } from './MemoryAwareRuntimeStack';
import { ExecutionLogger } from './ExecutionLogger';
import {
    ActionFragmentCompiler,
    DistanceFragmentCompiler,
    EffortFragmentCompiler,
    IncrementFragmentCompiler,
    LapFragmentCompiler,
    RepFragmentCompiler,
    ResistanceFragmentCompiler,
    RoundsFragmentCompiler,
    TextFragmentCompiler,
    TimerFragmentCompiler
} from './FragmentCompilers';

import { RuntimeClock } from './RuntimeClock';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export class ScriptRuntime implements IScriptRuntime {
    public readonly stack: RuntimeStack;
    public readonly jit: JitCompiler;
    public readonly memory: IRuntimeMemory;
    public readonly metrics: IMetricCollector;
    public readonly clock: RuntimeClock;
    public readonly fragmentCompiler: FragmentCompilationManager;
    public readonly errors: RuntimeError[] = [];
    private readonly executionLogger: ExecutionLogger;
    private _lastUpdatedBlocks: Set<string> = new Set();
    
    constructor(public readonly script: WodScript, compiler: JitCompiler) {
        this.memory = new RuntimeMemory();
        this.executionLogger = new ExecutionLogger(this.memory);
        this.stack = new MemoryAwareRuntimeStack(this, this.executionLogger);
        this.metrics = new MetricCollector();
        this.clock = new RuntimeClock();
        this.jit = compiler;
        
        // Initialize fragment compilation manager with all compilers
        this.fragmentCompiler = new FragmentCompilationManager([
            new ActionFragmentCompiler(),
            new DistanceFragmentCompiler(),
            new EffortFragmentCompiler(),
            new IncrementFragmentCompiler(),
            new LapFragmentCompiler(),
            new RepFragmentCompiler(),
            new ResistanceFragmentCompiler(),
            new RoundsFragmentCompiler(),
            new TextFragmentCompiler(),
            new TimerFragmentCompiler()
        ]);
        
        // Start the clock
        this.clock.start();
    }

    /**
     * Gets the currently active execution spans from memory.
     * Used by UI to display ongoing execution state.
     */
    public get activeSpans(): ReadonlyMap<string, ExecutionRecord> {
        return this.executionLogger.getActiveSpans();
    }

    /**
     * Gets the execution history from memory.
     * Note: This returns a copy of the records.
     */
    public get executionLog(): ExecutionRecord[] {
        return this.executionLogger.getLog();
    }

    handle(event: IEvent): void {
        const allActions: IRuntimeAction[] = [];
        const updatedBlocks = new Set<string>();

        // UNIFIED HANDLER PROCESSING: Get ALL handlers from memory (not just current block)
        const handlerRefs = this.memory.search({ type: 'handler', id: null, ownerId: null, visibility: null });
        const allHandlers = handlerRefs
            .map(ref => this.memory.get(ref as any))
            .filter(Boolean) as IEventHandler[];

        // Process ALL handlers in memory
        for (let i = 0; i < allHandlers.length; i++) {
            const handler = allHandlers[i];
            const actions = handler.handler(event, this);

            if (actions.length > 0) {
                allActions.push(...actions);
            }
            
            // Check for errors - if runtime has errors, abort further processing
            if (this.errors && this.errors.length > 0) {
                break;
            }
        }

        for (let i = 0; i < allActions.length; i++) {
            const action = allActions[i];
            action.do(this);
        }
        
        // Store updated blocks for consumers to query
        this._lastUpdatedBlocks = updatedBlocks;
    }
    
    /**
     * Gets the blocks that were updated during the last event processing.
     * This allows consumers to make decisions about what state needs to be updated in the UI.
     */
    public getLastUpdatedBlocks(): string[] {
        return Array.from(this._lastUpdatedBlocks);
    }

    /**
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty.
     * Note: A fresh runtime starts with an empty stack, so this will return true
     * until a block is pushed. Consumers should ensure the runtime is initialized
     * with a root block before checking completion.
     */
    public isComplete(): boolean {
        return this.stack.blocks.length === 0;
    }

    /**
     * Helper method to safely pop and dispose a block following the new lifecycle pattern.
     * This demonstrates the consumer-managed dispose pattern.
     */
    public popAndDispose(): void {
        const poppedBlock = this.stack.pop();
        
        if (poppedBlock) {
            // Consumer responsibility: call dispose() on the popped block
            try {
                poppedBlock.dispose(this);
            } catch (error) {
                console.error(`  ❌ Error disposing block: ${error}`);
                // Continue execution despite dispose error
            }
        }
    }

    /**
     * Emergency cleanup method that disposes all blocks in the stack.
     * Useful for shutdown or error recovery scenarios.
     */
    public disposeAllBlocks(): void {
        // Stop the clock
        this.clock.stop();

        const disposeErrors: Error[] = [];
        
        while (this.stack.blocks.length > 0) {
            const block = this.stack.pop();
            if (block) {
                try {
                    block.dispose(this);
                } catch (error) {
                    disposeErrors.push(error as Error);
                    console.error(`  ❌ Error disposing ${block.key.toString()}: ${error}`);
                }
            }
        }
        
        if (disposeErrors.length > 0) {
            console.warn(`🧠 ScriptRuntime.disposeAllBlocks() - ${disposeErrors.length} dispose errors occurred`);
        }
    }
    
    tick(): IEvent[] {
        const currentBlock = this.stack.current;
        if (!currentBlock) {
            return [];
        }

        // In the new Push/Next/Pop pattern, we might emit timer events or check for completion
        // For now, we'll emit a generic tick event that blocks can handle
        const tickEvent: IEvent = {
            name: 'tick',
            timestamp: new Date(),
            data: { source: 'runtime' }
        };

        this.handle(tickEvent);

        return [];
    }
}
