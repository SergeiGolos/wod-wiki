import { IEvent } from './contracts/events/IEvent';
import { IEventHandler } from './contracts/events/IEventHandler';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IRuntimeBlock } from './contracts/IRuntimeBlock';
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { ICodeFragment } from '../core/models/CodeFragment';
import { OutputStatement, OutputStatementType } from '../core/models/OutputStatement';
import { TimeSpan } from './models/TimeSpan';
import { MemoryType, MemoryValueOf } from './memory/MemoryTypes';
import {
    IBehaviorContext,
    BehaviorEventType,
    BehaviorEventListener,
    OutputOptions,
    Unsubscribe,
} from './contracts/IBehaviorContext';

/**
 * BehaviorContext is the concrete implementation of IBehaviorContext.
 * 
 * It is created by RuntimeBlock when a block is mounted and provides
 * behaviors with a unified API for:
 * - Subscribing to events (tick, next, etc.)
 * - Emitting events (for coordination)
 * - Emitting output statements (for reporting)
 * - Reading and writing block memory
 * - Marking the block as complete
 * 
 * ## Lifecycle
 * 
 * 1. Created during block.mount()
 * 2. Passed to behavior.onMount(ctx)
 * 3. Same context passed to behavior.onNext(ctx)
 * 4. Same context passed to behavior.onUnmount(ctx)
 * 5. dispose() called during block.unmount() to clean up subscriptions
 */
export class BehaviorContext implements IBehaviorContext {
    private subscriptions: Array<{ eventType: string; unsubscribe: () => void }> = [];

    constructor(
        readonly block: IRuntimeBlock,
        readonly clock: IRuntimeClock,
        readonly stackLevel: number,
        private runtime: IScriptRuntime
    ) { }

    // ============================================================================
    // Event Subscription
    // ============================================================================

    subscribe(eventType: BehaviorEventType, listener: BehaviorEventListener): Unsubscribe {
        const handler: IEventHandler = {
            id: `behavior-${this.block.key.toString()}-${eventType}-${Date.now()}`,
            name: `BehaviorHandler-${this.block.label}-${eventType}`,
            handler: (event: IEvent, _runtime: IScriptRuntime): IRuntimeAction[] => {
                return listener(event, this);
            }
        };

        // Register with event bus scoped to this block
        const unsub = this.runtime.eventBus.register(
            eventType,
            handler,
            this.block.key.toString()
        );

        this.subscriptions.push({ eventType, unsubscribe: unsub });
        return unsub;
    }

    // ============================================================================
    // Event Emission
    // ============================================================================

    emitEvent(event: IEvent): void {
        this.runtime.handle(event);
    }

    // ============================================================================
    // Output Emission
    // ============================================================================

    emitOutput(
        type: OutputStatementType,
        fragments: ICodeFragment[],
        _options?: OutputOptions
    ): void {
        const now = this.clock.now;

        // Tag fragments with source block and timestamp
        const taggedFragments = fragments.map(f => ({
            ...f,
            sourceBlockKey: f.sourceBlockKey ?? this.block.key.toString(),
            timestamp: f.timestamp ?? now
        }));

        // Create the output statement
        const output = new OutputStatement({
            outputType: type,
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: this.block.key.toString(),
            sourceStatementId: this.block.sourceIds?.[0],
            stackLevel: this.stackLevel,
            fragments: taggedFragments,
        });

        // Add to runtime's output collection and notify subscribers
        // We access the private fields via the runtime interface
        // The runtime exposes subscribeToOutput() but we need addOutput() for internal use
        this.addOutputToRuntime(output);
    }

    /**
     * Add output to the runtime's collection and notify subscribers.
     */
    private addOutputToRuntime(output: OutputStatement): void {
        // Use the public addOutput method if available (ScriptRuntime exposes this)
        const runtime = this.runtime as any;
        if (typeof runtime.addOutput === 'function') {
            runtime.addOutput(output);
        } else {
            // Fallback: access internal state directly
            if (runtime._outputStatements && Array.isArray(runtime._outputStatements)) {
                runtime._outputStatements.push(output);
            }

            if (runtime._outputListeners && runtime._outputListeners instanceof Set) {
                for (const listener of runtime._outputListeners) {
                    try {
                        listener(output);
                    } catch (err) {
                        console.error('[BehaviorContext] Output listener error:', err);
                    }
                }
            }
        }
    }

    // ============================================================================
    // Memory Access
    // ============================================================================

    getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined {
        const entry = this.block.getMemory(type);
        return entry?.value;
    }

    setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
        // Use the block's public setMemoryValue method
        this.block.setMemoryValue(type, value);
    }

    // ============================================================================
    // Block Control
    // ============================================================================

    markComplete(reason?: string): void {
        this.block.markComplete(reason);
    }

    // ============================================================================
    // Lifecycle
    // ============================================================================

    /**
     * Dispose of all subscriptions.
     * Called by RuntimeBlock during unmount.
     */
    dispose(): void {
        for (const { unsubscribe } of this.subscriptions) {
            try {
                unsubscribe();
            } catch (err) {
                console.error('[BehaviorContext] Unsubscribe error:', err);
            }
        }
        this.subscriptions = [];
    }
}
