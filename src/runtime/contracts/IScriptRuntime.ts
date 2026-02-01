import { JitCompiler } from '../compiler/JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { IEvent } from "./events/IEvent";
import { RuntimeError } from '../actions/ErrorAction';
import { IEventBus } from './events/IEventBus';
import { IRuntimeStack, Unsubscribe } from './IRuntimeStack';
import { IRuntimeClock } from './IRuntimeClock';
import { IOutputStatement } from '../../core/models/OutputStatement';
import { ICodeStatement } from '../../core/types/core';

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
     * Checks if the runtime execution has completed.
     * Returns true if the stack is empty and execution has finished.
     */
    isComplete(): boolean;

    // ============================================================================
    // Statement Lookup API
    // ============================================================================

    /**
     * Get a statement by its ID in O(1) time.
     * Used by behaviors that need to look up child statements.
     * 
     * @param id The statement ID to look up
     * @returns The statement, or undefined if not found
     */
    getStatementById?(id: number): ICodeStatement | undefined;

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

    handle(event: IEvent): void;
    dispose(): void;
}

