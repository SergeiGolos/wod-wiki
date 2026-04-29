import { JitCompiler } from '../compiler/JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { RuntimeError } from '../actions/ErrorAction';
import { IEventBus } from './events/IEventBus';
import { IRuntimeStack, Unsubscribe, StackObserver } from './IRuntimeStack';
import { IRuntimeClock } from './IRuntimeClock';
import { IOutputStatement } from '../../core/models/OutputStatement';
import { IRuntimeAction } from './IRuntimeAction';
import { IEvent } from './events/IEvent';
import { IAnalyticsEngine } from '../../core/contracts/IAnalyticsEngine';
import { RuntimeStackOptions, RuntimeStackTracker, TrackerUpdate } from './IRuntimeOptions';
import type { IRuntimeActionable } from './primitives/IRuntimeActionable';
import type { BlockLifecycleOptions } from './primitives/IBlockLifecycle';
import type { IRuntimeBlock } from './IRuntimeBlock';

/**
 * Listener callback for output statement events.
 */
export type OutputListener = (output: IOutputStatement) => void;

/**
 * Listener callback for real-time tracker updates.
 */
export type TrackerListener = (update: TrackerUpdate) => void;

export interface IScriptRuntime extends IRuntimeActionable {
    options: RuntimeStackOptions;
    tracker?: RuntimeStackTracker;
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
    pushBlock(block: IRuntimeBlock, lifecycle?: BlockLifecycleOptions): void;

    /**
     * Pops the current block from the runtime stack.
     * This is a convenience method that wraps PopBlockAction.
     * Handles the full lifecycle: unmount, pop, dispose, and parent notification.
     * 
     * @param lifecycle Optional lifecycle options (completedAt, etc.)
     */
    popBlock(lifecycle?: BlockLifecycleOptions): void;

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
     *   console.log('Fragments:', output.metrics);
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
     *   metrics: [],
     * }));
     * ```
     */
    addOutput(output: IOutputStatement): void;

    // ============================================================================
    // Tracker Update API
    // ============================================================================

    /**
     * Subscribe to real-time tracker updates (reps, rounds).
     * 
     * @param listener Callback invoked for each tracker update
     * @returns Unsubscribe function to stop receiving notifications
     */
    subscribeToTracker(listener: TrackerListener): Unsubscribe;

    // ============================================================================
    // Stack Observer API
    // ============================================================================

    /**
     * Subscribe to stack snapshots. The observer receives a StackSnapshot
     * on every push/pop/clear event, containing the full stack state,
     * the affected block, depth, and clock time.
     * 
     * New subscribers immediately receive an 'initial' snapshot with the
     * current stack state.
     * 
     * This is the primary API for UI consumers to react to stack changes.
     * 
     * @param observer Callback invoked with a StackSnapshot on each stack mutation
     * @returns Unsubscribe function to stop receiving notifications
     * 
     * @example
     * ```typescript
     * const unsubscribe = runtime.subscribeToStack((snapshot) => {
     *   console.log(`Stack ${snapshot.type}: depth=${snapshot.depth}`);
     *   if (snapshot.affectedBlock) {
     *     console.log(`Affected: ${snapshot.affectedBlock.label}`);
     *   }
     * });
     * ```
     */
    subscribeToStack(observer: StackObserver): Unsubscribe;

    /**
     * Set the analytics engine for the runtime.
     * The engine will process each output statement as it is added.
     */
    setAnalyticsEngine(engine: IAnalyticsEngine): void;

    /**
     * Finalize the analytics engine and return any summary output statements.
     * These statements are also automatically added to the runtime's internal list.
     */
    finalizeAnalytics(): IOutputStatement[];

    dispose(): void;
}
