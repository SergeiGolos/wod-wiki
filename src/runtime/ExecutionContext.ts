import { IScriptRuntime, OutputListener } from './contracts/IScriptRuntime';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { SnapshotClock } from './RuntimeClock';
import { Unsubscribe } from './contracts/IRuntimeStack';
import { IOutputStatement } from '../core/models/OutputStatement';
import { IEvent } from './contracts/events/IEvent';
import { PushBlockAction } from './actions/stack/PushBlockAction';
import { PopBlockAction } from './actions/stack/PopBlockAction';

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
    private _stack: IRuntimeAction[] = [];
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

    dispose(): void {
        this._runtime.dispose();
    }

    /**
     * Pushes an action onto the execution stack to be processed in this turn.
     * Actions pushed during another action's execution will be processed next (LIFO).
     */
    do(action: IRuntimeAction): void {
        this._stack.push(action);
    }

    /**
     * Pushes multiple actions onto the stack in the correct order for LIFO processing.
     * The first action in the array will execute first.
     * 
     * Internally pushes in reverse order so the first action lands on top of the stack.
     */
    doAll(actions: IRuntimeAction[]): void {
        if (actions.length === 0) return;
        for (let i = actions.length - 1; i >= 0; i--) {
            this._stack.push(actions[i]);
        }
    }

    /**
     * Dispatches an event and pushes all resulting actions onto the stack.
     * Uses doAll() to handle LIFO ordering internally.
     */
    handle(event: IEvent): void {
        const actions = this.eventBus.dispatch(event, this);
        this.doAll(actions);
    }

    /**
     * Pushes a block onto the runtime stack.
     * Pushes the PushBlockAction onto this execution context's action stack.
     */
    pushBlock(block: import('./contracts/IRuntimeBlock').IRuntimeBlock, lifecycle?: import('./contracts/IRuntimeBlock').BlockLifecycleOptions): void {
        this.do(new PushBlockAction(block, lifecycle));
    }

    /**
     * Pops the current block from the runtime stack.
     * Pushes the PopBlockAction onto this execution context's action stack.
     */
    popBlock(lifecycle?: import('./contracts/IRuntimeBlock').BlockLifecycleOptions): void {
        this.do(new PopBlockAction(lifecycle));
    }

    /**
     * Executes an initial action and then all subsequent actions on the stack until empty.
     * 
     * Uses LIFO (stack) ordering: when an action produces child actions via `runtime.do()`,
     * those children execute before any remaining sibling actions. This ensures depth-first
     * processing of block lifecycle chains (pop → parent.next() → push child).
     * 
     * @throws Error if max iterations reached
     */
    execute(initialAction: IRuntimeAction): void {
        this._stack.push(initialAction);

        while (this._stack.length > 0) {
            if (this._iteration >= this._maxIterations) {
                const errorMsg = `[ExecutionContext] Max iterations reached (${this._maxIterations}). Aborting to prevent infinite loop.`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

            // LIFO: pop from the top of the stack (last-in, first-out)
            const action = this._stack.pop()!;
            this._iteration++;

            // Execute the action using THIS context as the runtime
            // This ensures any nested .do() calls come back here and are
            // pushed onto the same stack for depth-first processing
            action.do(this);
        }
    }
}

