import { IScriptRuntime, OutputListener } from './contracts/IScriptRuntime';
import { JitCompiler } from './compiler/JitCompiler';
import { IRuntimeStack, Unsubscribe } from './contracts/IRuntimeStack';
import { WodScript } from '../parser/WodScript';
import type { RuntimeError } from './actions/ErrorAction';
import { IEventBus } from './contracts/events/IEventBus';
import {
    DEFAULT_RUNTIME_OPTIONS,
    RuntimeStackOptions
} from './contracts/IRuntimeOptions';
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { NextEventHandler } from './events/NextEventHandler';
import { IOutputStatement } from '../core/models/OutputStatement';
import { IRuntimeAction } from './contracts';
import { IEvent } from './contracts/events/IEvent';
import { ExecutionContext } from './ExecutionContext';

export type RuntimeState = 'idle' | 'running' | 'compiling' | 'completed';

export interface ScriptRuntimeDependencies {
    stack: IRuntimeStack;
    clock: IRuntimeClock;
    eventBus: IEventBus;
}

export class ScriptRuntime implements IScriptRuntime {

    public readonly eventBus: IEventBus;
    public readonly clock: IRuntimeClock;
    public readonly stack: IRuntimeStack;
    public readonly jit: JitCompiler;

    public readonly errors: RuntimeError[] = [];
    public readonly options: RuntimeStackOptions;    
        
    // Output statement tracking
    private _outputStatements: IOutputStatement[] = [];
    private _outputListeners: Set<OutputListener> = new Set();

    // The current execution context for the "turn"
    private _activeContext: ExecutionContext | null = null;

    constructor(
        public readonly script: WodScript,
        compiler: JitCompiler,
        dependencies: ScriptRuntimeDependencies,
        options: RuntimeStackOptions = {}
    ) {
        // Merge with defaults
        this.options = { ...DEFAULT_RUNTIME_OPTIONS, ...options };

        this.stack = dependencies.stack;
        this.clock = dependencies.clock;
        this.eventBus = dependencies.eventBus;
        
        // Handle explicit next events to advance the current block once per request
        this.eventBus.register('next', new NextEventHandler('runtime-next-handler'), 'runtime', { scope: 'global' });
               
        this.jit = compiler;

        // Start the clock
        this.clock.start();
    }

    /**
     * Executes an action within a managed execution context (a "turn").
     * Actions can queue further actions which will be processed in the same turn.
     * Time is frozen during the turn.
     */
    public do(action: IRuntimeAction): void {
        if (this._activeContext) {
            this._activeContext.do(action);
            return;
        }

        this._activeContext = new ExecutionContext(this, this.options.maxActionDepth ?? 20);
        try {
            this._activeContext.execute(action);
        } finally {
            this._activeContext = null;
        }
    }

    /**
     * Dispatches an event to the event bus and executes any resulting actions
     * within a single execution turn.
     */
    public handle(event: IEvent): void {
        const actions = this.eventBus.dispatch(event, this);
        if (actions.length === 0) return;

        // Wrap multiple actions in a single turn if more than one is returned
        this.do({
            type: 'composite-event-action',
            do: (runtime) => {
                for (const action of actions) {
                    runtime.do(action);
                }
            }
        });
    }
       
    // ========== Output Statement API ==========

    /**
     * Subscribe to output statements generated during execution.
     */
    public subscribeToOutput(listener: OutputListener): Unsubscribe {
        this._outputListeners.add(listener);
        return () => {
            this._outputListeners.delete(listener);
        };
    }

    /**
     * Get all output statements generated so far.
     */
    public getOutputStatements(): IOutputStatement[] {
        return [...this._outputStatements];
    }

    /**
     * Add an output statement to the collection and notify subscribers.
     * Used by BehaviorContext to emit outputs at any lifecycle point.
     */
    public addOutput(output: IOutputStatement): void {
        this._outputStatements.push(output);

        for (const listener of this._outputListeners) {
            try {
                listener(output);
            } catch (err) {
                console.error('[RT] Output listener error:', err);
            }
        }
    }    

    /**
     * Emergency cleanup method that disposes all blocks in the stack.
     */
    public dispose(): void {
        // Stop the clock
        this.clock.stop();
        while (this.stack.count > 0) {
            this.stack.pop();
        }
    }   
}
