import { IScriptRuntime, OutputListener } from './contracts/IScriptRuntime';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { SnapshotClock } from './RuntimeClock';
import { Unsubscribe } from './contracts/IRuntimeStack';
import { IOutputStatement } from '../core/models/OutputStatement';
import { IEvent } from './contracts/events/IEvent';

/**
 * ExecutionContext manages a "turn" of execution.
 * It wraps a runtime and ensures that all actions queued during the turn
 * see a consistent frozen clock and share an execution depth limit.
 */
export class ExecutionContext implements IScriptRuntime {
    private _queue: IRuntimeAction[] = [];
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
     * Queues an action to be executed in this turn.
     * Implementation of IScriptRuntime.do
     */
    do(action: IRuntimeAction): void {
        this._queue.push(action);
    }

    /**
     * Dispatches an event and executes all resulting actions in this turn.
     * Implementation of IScriptRuntime.handle
     */
    handle(event: IEvent): void {
        const actions = this.eventBus.dispatch(event, this);
        for (const action of actions) {
            this.do(action);
        }
    }

    /**
     * Pushes a block onto the runtime stack.
     * Queues the PushBlockAction in this execution context.
     */
    pushBlock(block: import('./contracts/IRuntimeBlock').IRuntimeBlock, lifecycle?: import('./contracts/IRuntimeBlock').BlockLifecycleOptions): void {
        const { PushBlockAction } = require('./actions/stack/PushBlockAction');
        this.do(new PushBlockAction(block, lifecycle));
    }

    /**
     * Pops the current block from the runtime stack.
     * Queues the PopBlockAction in this execution context.
     */
    popBlock(lifecycle?: import('./contracts/IRuntimeBlock').BlockLifecycleOptions): void {
        const { PopBlockAction } = require('./actions/stack/PopBlockAction');
        this.do(new PopBlockAction(lifecycle));
    }

    /**
     * Executes an initial action and then all subsequent actions queued until exhausted.
     * @throws Error if max iterations reached
     */
    execute(initialAction: IRuntimeAction): void {
        this._queue.push(initialAction);
        
        while (this._queue.length > 0) {
            if (this._iteration >= this._maxIterations) {
                const errorMsg = `[ExecutionContext] Max iterations reached (${this._maxIterations}). Aborting to prevent infinite loop.`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

            const action = this._queue.shift()!;
            this._iteration++;
            
            // Execute the action using THIS context as the runtime
            // This ensures any nested .do() calls come back here
            action.do(this);
        }
    }
}
