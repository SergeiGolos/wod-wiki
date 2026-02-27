import { IScriptRuntime, OutputListener } from './contracts/IScriptRuntime';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { SnapshotClock } from './RuntimeClock';
import { Unsubscribe, StackObserver } from './contracts/IRuntimeStack';
import { IOutputStatement } from '../core/models/OutputStatement';
import { IEvent } from './contracts/events/IEvent';
import { PushBlockAction } from './actions/stack/PushBlockAction';
import { PopBlockAction } from './actions/stack/PopBlockAction';
import { EmitSystemOutputAction } from './actions/stack/EmitSystemOutputAction';

/**
 * ExecutionContext manages a "turn" of execution.
 * 
 * It wraps a runtime and ensures that all actions pushed during the turn
 * see a consistent frozen clock and share an execution depth limit.
 * 
 * ## Stack Semantics (LIFO)
 * 
 * Actions are processed using a **stack** (Last-In-First-Out). When an action
 * produces child actions via `runtime.do()`, those children are pushed onto the
 * stack and executed **before** returning to any remaining sibling actions.
 * 
 * This ensures that nested operations (e.g., a pop that triggers a parent.next()
 * which pushes a new child) complete their full depth before processing continues
 * at the parent level — mirroring the natural call-stack behavior of block
 * lifecycle operations.
 * 
 * ## Lifecycle
 * 
 * 1. Created by `ScriptRuntime.do()` or `ScriptRuntime.handle()` when no active context exists
 * 2. Clock is frozen at creation time (SnapshotClock)
 * 3. Actions are executed from the stack until empty
 * 4. Context is discarded — all actions in the turn shared the same frozen timestamp
 */
export class ExecutionContext implements IScriptRuntime {
    private _workList: IRuntimeAction[] = [];
    private _iteration = 0;
    private readonly _maxIterations: number;
    private readonly _snapshotClock: SnapshotClock;

    constructor(
        private readonly _runtime: IScriptRuntime,
        maxIterations = 20
    ) {
        this._maxIterations = maxIterations;
        // Freeze the clock at the start of the execution context
        this._snapshotClock = SnapshotClock.at(_runtime.clock, _runtime.clock.now);
    }

    // --- Delegation to underlying runtime ---

    get script() { return this._runtime.script; }
    get eventBus() { return this._runtime.eventBus; }
    get stack() { return this._runtime.stack; }
    get options() { return this._runtime.options; }
    get tracker() { return this._runtime.tracker; }
    get jit() { return this._runtime.jit; }
    get errors() { return this._runtime.errors; }

    // Use our frozen clock instead of the live runtime clock
    get clock() { return this._snapshotClock; }

    subscribeToOutput(listener: OutputListener): Unsubscribe {
        return this._runtime.subscribeToOutput(listener);
    }

    getOutputStatements(): IOutputStatement[] {
        return this._runtime.getOutputStatements();
    }

    addOutput(output: IOutputStatement): void {
        this._runtime.addOutput(output);
    }

    subscribeToStack(observer: StackObserver): Unsubscribe {
        return this._runtime.subscribeToStack(observer);
    }

    dispose(): void {
        this._runtime.dispose();
    }

    /**
     * Pushes an action onto the execution work list to be processed in this turn.
     * Actions pushed during another action's execution will be appended to the end
     * of the list (FIFO side-effect queuing).
     */
    do(action: IRuntimeAction): void {
        this._workList.push(action);
    }

    /**
     * Pushes multiple actions onto the work list.
     * They will be executed in the order provided (FIFO).
     */
    doAll(actions: IRuntimeAction[]): void {
        if (actions.length === 0) return;
        this._workList.push(...actions);
    }

    /**
     * Dispatches an event and pushes all resulting actions onto the work list.
     */
    handle(event: IEvent): void {
        const actions = this.eventBus.dispatch(event, this);
        if (actions.length > 0) {
            const systemOutput = new EmitSystemOutputAction(
                `event: ${event.name} → ${actions.length} action(s)`,
                'event-action',
                (event as any).source ?? 'event-bus',
                undefined,
                this.stack.count,
                { eventName: event.name, actionTypes: actions.map(a => a.type) }
            );
            this.doAll([systemOutput, ...actions]);
        } else {
            this.doAll(actions);
        }
    }

    /**
     * Pushes a block onto the runtime stack.
     * Pushes the PushBlockAction onto this execution context's action work list.
     */
    pushBlock(block: import('./contracts/IRuntimeBlock').IRuntimeBlock, lifecycle?: import('./contracts/IRuntimeBlock').BlockLifecycleOptions): void {
        this.do(new PushBlockAction(block, lifecycle));
    }

    /**
     * Pops the current block from the runtime stack.
     * Pushes the PopBlockAction onto this execution context's action work list.
     */
    popBlock(lifecycle?: import('./contracts/IRuntimeBlock').BlockLifecycleOptions): void {
        this.do(new PopBlockAction(lifecycle));
    }

    /**
     * Executes an initial action and then all subsequent actions on the work list until empty.
     * 
     * Uses an 'Ordered Stack' model:
     * 1. **Queued actions (do)** are appended to the back (FIFO).
     * 2. **Returned actions (children)** are prepended to the front (Depth-First).
     * 3. **Execution** always takes from the front.
     * 
     * This ensures that nested operations (e.g., a pop that triggers a parent.next())
     * complete their full depth before processing continues at the sibling level,
     * while explicitly queued side-effects run in the order they were triggered.
     * 
     * @throws Error if max iterations reached
     */
    execute(initialAction: IRuntimeAction): void {
        this._workList.push(initialAction);

        while (this._workList.length > 0) {
            if (this._iteration >= this._maxIterations) {
                const errorMsg = `[ExecutionContext] Max iterations reached (${this._maxIterations}). Aborting to prevent infinite loop.`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

            // Always take from the front
            const action = this._workList.shift()!;
            this._iteration++;

            // Execute the action using THIS context as the runtime.
            const childActions = action.do(this);

            // If the action returned child actions, prepend them to the front
            // of the work list to maintain depth-first processing.
            if (childActions && childActions.length > 0) {
                this._workList.unshift(...childActions);
            }
        }
    }
}

