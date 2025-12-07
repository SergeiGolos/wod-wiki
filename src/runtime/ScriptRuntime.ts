import { IScriptRuntime } from './IScriptRuntime';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack, RuntimeStackLogger, RuntimeStackOptions } from './RuntimeStack';
import { WodScript } from '../parser/WodScript';
import { IEvent } from "./IEvent";
import { IEventHandler } from "./IEventHandler";
import { IRuntimeAction } from './IRuntimeAction';
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeMemory } from './RuntimeMemory';
import type { RuntimeError } from './actions/ErrorAction';
import { IMetricCollector, MetricCollector } from './MetricCollector';
import { ExecutionSpan } from './models/ExecutionSpan';
import { FragmentCompilationManager } from './FragmentCompilationManager';
import { MemoryAwareRuntimeStack } from './MemoryAwareRuntimeStack';
import { DebugRuntimeStack } from './DebugRuntimeStack';
import { ExecutionTracker } from './ExecutionTracker';
import { EventBus } from './EventBus';
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
import { DEFAULT_RUNTIME_OPTIONS } from './IRuntimeOptions';
import { NextBlockLogger } from './NextBlockLogger';
import { TestableBlock } from './testing/TestableBlock';

import { RuntimeClock } from './RuntimeClock';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export class ScriptRuntime implements IScriptRuntime {
    public readonly stack: RuntimeStack;
    public readonly jit: JitCompiler;
    public readonly memory: IRuntimeMemory;
    public readonly metrics: IMetricCollector;
    public readonly clock: RuntimeClock;
    public readonly eventBus: EventBus;
    public readonly fragmentCompiler: FragmentCompilationManager;
    public readonly errors: RuntimeError[] = [];
    public readonly options: RuntimeStackOptions;
    private readonly executionTracker: ExecutionTracker;
    private _lastUpdatedBlocks: Set<string> = new Set();
    
    constructor(
        public readonly script: WodScript, 
        compiler: JitCompiler,
        options: RuntimeStackOptions = {}
    ) {
        // Merge with defaults
        this.options = { ...DEFAULT_RUNTIME_OPTIONS, ...options };
        
        this.memory = new RuntimeMemory();
        this.executionTracker = new ExecutionTracker(this.memory);
        this.eventBus = new EventBus();
        
        const unregisterHook = this.options.hooks?.unregisterByOwner;
        const stackOptions: RuntimeStackOptions = {
            ...this.options,
            tracker: this.options.tracker ?? this.executionTracker,
            logger: this.options.logger ?? this.createStackLogger(),
            hooks: {
                ...this.options.hooks,
                unregisterByOwner: (ownerKey: string) => {
                    unregisterHook?.(ownerKey);
                    this.eventBus.unregisterByOwner(ownerKey);
                },
            },
        };

        // Use DebugRuntimeStack if debugMode is enabled, otherwise use MemoryAwareRuntimeStack
        if (this.options.debugMode) {
            this.stack = new DebugRuntimeStack(this, this.executionTracker, stackOptions);
            
            // Enable NextBlockLogger automatically in debug mode
            NextBlockLogger.setEnabled(true);
            console.log('🔍 ScriptRuntime: Debug mode enabled - blocks will be wrapped with TestableBlock');
        } else {
            this.stack = new MemoryAwareRuntimeStack(this, this.executionTracker, stackOptions);
        }
        
        // Enable logging if explicitly requested (even without full debug mode)
        if (this.options.enableLogging && !this.options.debugMode) {
            NextBlockLogger.setEnabled(true);
        }
        
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
    public get activeSpans(): ReadonlyMap<string, ExecutionSpan> {
        return this.executionTracker.getActiveSpansMap();
    }

    /**
     * Gets the execution history from memory.
     * Note: This returns a copy of the records.
     */
    public get executionLog(): ExecutionSpan[] {
        return this.executionTracker.getCompletedSpans();
    }

    /**
     * Gets the ExecutionTracker for direct metric recording.
     * Used by actions and behaviors to record metrics to active spans.
     */
    public get tracker(): ExecutionTracker {
        return this.executionTracker;
    }

    handle(event: IEvent): void {
        this.eventBus.dispatch(event, this);
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
        this.stack.pop();
    }

    /**
     * Emergency cleanup method that disposes all blocks in the stack.
     * Useful for shutdown or error recovery scenarios.
     */
    public disposeAllBlocks(): void {
        // Stop the clock
        this.clock.stop();

        while (this.stack.blocks.length > 0) {
            this.stack.pop();
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
    
    // ========== Debug API ==========
    
    /**
     * Whether the runtime is in debug mode.
     * When true, blocks are wrapped with TestableBlock for inspection.
     */
    public get isDebugMode(): boolean {
        return this.options.debugMode ?? false;
    }
    
    /**
     * Get the debug stack (only available in debug mode).
     * Returns undefined if debug mode is not enabled.
     */
    public get debugStack(): DebugRuntimeStack | undefined {
        if (this.isDebugMode && this.stack instanceof DebugRuntimeStack) {
            return this.stack;
        }
        return undefined;
    }
    
    /**
     * Get all wrapped TestableBlock instances (debug mode only).
     * Returns empty map if debug mode is not enabled.
     */
    public getWrappedBlocks(): ReadonlyMap<string, TestableBlock> {
        return this.debugStack?.wrappedBlocks ?? new Map();
    }
    
    /**
     * Get a specific wrapped block by its key (debug mode only).
     */
    public getWrappedBlock(blockKey: string): TestableBlock | undefined {
        return this.debugStack?.getWrappedBlock(blockKey);
    }

    private createStackLogger(): RuntimeStackLogger {
        return {
            debug: (message: string, details?: Record<string, unknown>) => {
                if (this.options.enableLogging || this.options.debugMode) {
                    console.debug(message, details);
                }
            },
            error: (message: string, error: unknown, details?: Record<string, unknown>) => {
                console.error(message, error, details);
            },
        };
    }
    
    /**
     * Get all method calls from all wrapped blocks (debug mode only).
     * Useful for inspecting the complete lifecycle history.
     */
    public getAllBlockCalls(): Array<{ blockKey: string; calls: ReadonlyArray<any> }> {
        return this.debugStack?.getAllCalls() ?? [];
    }
    
    /**
     * Clear all recorded calls from wrapped blocks (debug mode only).
     */
    public clearAllBlockCalls(): void {
        this.debugStack?.clearAllCalls();
    }
    
    /**
     * Get NextBlockLogger history for analysis.
     */
    public getLogHistory(): ReadonlyArray<any> {
        return NextBlockLogger.getHistory();
    }
    
    /**
     * Get NextBlockLogger summary string.
     */
    public getLogSummary(): string {
        return NextBlockLogger.getSummary();
    }
    
    /**
     * Clear NextBlockLogger history.
     */
    public clearLogHistory(): void {
        NextBlockLogger.clearHistory();
    }
}
