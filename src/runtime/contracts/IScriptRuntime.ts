import { JitCompiler } from '../compiler/JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { IEvent } from "./events/IEvent";
import { IRuntimeMemory } from './IRuntimeMemory';
import { RuntimeError } from '../actions/ErrorAction';

import { SpanTrackingHandler } from '../../tracker/SpanTrackingHandler';

import { IEventBus } from './events/IEventBus';
import { IRuntimeStack, Unsubscribe } from './IRuntimeStack';
import { IRuntimeClock } from './IRuntimeClock';
import { BlockLifecycleOptions, IRuntimeBlock } from './IRuntimeBlock';
import { IRuntimeAction } from './IRuntimeAction';
import { IOutputStatement } from '../../core/models/OutputStatement';

/**
 * Listener callback for output statement events.
 */
export type OutputListener = (output: IOutputStatement) => void;

export interface IScriptRuntime {
    script: WodScript;

    eventBus: IEventBus;
    memory: IRuntimeMemory;
    stack: IRuntimeStack;

    jit: JitCompiler;
    clock: IRuntimeClock;

    /** Errors collected during runtime execution */
    errors?: RuntimeError[];

    /** 
     * SpanTrackingHandler for recording metrics to active spans.
     * Use this to record metrics, start/end segments, etc.
     */
    tracker: SpanTrackingHandler;

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
     * Queue actions for processing. Actions are processed in order.
     * Optional method - may not be implemented by all runtimes (e.g., test mocks).
     */
    queueActions?(actions: IRuntimeAction[]): void;

    /**
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty and execution has finished.
     */
    isComplete(): boolean;

    /**
     * Performs a completion sweep on the stack, popping all completed blocks.
     * Called after processing actions and events to autonomously clean up
     * blocks that have marked themselves as complete.
     */
    sweepCompletedBlocks(): void;

    // ============================================================================
    // Output Statement API
    // ============================================================================

    /**
     * Subscribe to output statements generated during execution.
     * Listeners are notified when a block unmounts and produces output.
     * 
     * @param listener Callback invoked for each output statement
     * @returns Unsubscribe function to stop receiving notifications
     * 
     * @example
     * ```typescript
     * const unsubscribe = runtime.subscribeToOutput((output) => {
     *   console.log(`Block ${output.sourceBlockKey} completed:`, output.outputType);
     *   console.log('Fragments:', output.fragments);
     * });
     * ```
     */
    subscribeToOutput(listener: OutputListener): Unsubscribe;

    /**
     * Get all output statements generated so far during this execution.
     * Returns a copy of the internal array.
     */
    getOutputStatements(): IOutputStatement[];

    handle(event: IEvent): void;
    dispose(): void;
}

