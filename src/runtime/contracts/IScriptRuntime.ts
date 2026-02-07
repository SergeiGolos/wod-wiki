import { JitCompiler } from '../compiler/JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { RuntimeError } from '../actions/ErrorAction';
import { IEventBus } from './events/IEventBus';
import { IRuntimeStack, Unsubscribe } from './IRuntimeStack';
import { IRuntimeClock } from './IRuntimeClock';
import { IOutputStatement } from '../../core/models/OutputStatement';
import { ICodeStatement } from '../../core/types/core';
import { IRuntimeAction } from './IRuntimeAction';
import { IEvent } from './events/IEvent';

/**
 * Listener callback for output statement events.
 */
export type OutputListener = (output: IOutputStatement) => void;

export interface IScriptRuntime {
    script: WodScript;

    eventBus: IEventBus;
    stack: IRuntimeStack;

    jit: JitCompiler;
    clock: IRuntimeClock;

    /** Errors collected during runtime execution */
    errors?: RuntimeError[];

    /**
     * Executes an action at the next available opportunity.
     * Actions are processed in "turns" where time is frozen and 
     * nested actions are allowed up to a recursion limit.
     */
    do(action: IRuntimeAction): void;

    /**
     * Pushes multiple actions onto the execution stack in the correct order
     * for LIFO processing. The first action in the array will execute first.
     * 
     * This method internalizes the reverse-push pattern so callers don't need
     * to know about LIFO stack mechanics — they just pass actions in the order
     * they want them executed.
     * 
     * @param actions Actions to execute, in desired execution order
     */
    doAll(actions: IRuntimeAction[]): void;

    /**
     * Dispatches an event and executes all resulting actions in a single turn.
     */
    handle(event: IEvent): void;

    /**
     * Pushes a block onto the runtime stack.
     * This is a convenience method that wraps PushBlockAction.
     * 
     * @param block The block to push
     * @param lifecycle Optional lifecycle options (startTime, etc.)
     */
    pushBlock(block: import('./IRuntimeBlock').IRuntimeBlock, lifecycle?: import('./IRuntimeBlock').BlockLifecycleOptions): void;

    /**
     * Pops the current block from the runtime stack.
     * This is a convenience method that wraps PopBlockAction.
     * Handles the full lifecycle: unmount, pop, dispose, and parent notification.
     * 
     * @param lifecycle Optional lifecycle options (completedAt, etc.)
     */
    popBlock(lifecycle?: import('./IRuntimeBlock').BlockLifecycleOptions): void;

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

    /**
     * Add an output statement to the collection and notify subscribers.
     * Used by BehaviorContext to emit outputs at any lifecycle point.
     * 
     * @param output The output statement to add
     * 
     * @example
     * ```typescript
     * runtime.addOutput(new OutputStatement({
     *   outputType: 'completion',
     *   timeSpan: new TimeSpan(start, end),
     *   sourceBlockKey: block.key.toString(),
     *   fragments: [],
     * }));
     * ```
     */
    addOutput(output: IOutputStatement): void;

    dispose(): void;
}

