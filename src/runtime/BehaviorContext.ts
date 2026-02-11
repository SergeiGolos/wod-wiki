import { IEvent } from './contracts/events/IEvent';
import { IEventHandler } from './contracts/events/IEventHandler';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IRuntimeBlock } from './contracts/IRuntimeBlock';
import { IRuntimeClock } from './contracts/IRuntimeClock';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { ICodeFragment } from '../core/models/CodeFragment';
import { OutputStatement, OutputStatementType } from '../core/models/OutputStatement';
import { TimeSpan } from './models/TimeSpan';
import { IMemoryLocation, MemoryLocation, MemoryTag } from './memory/MemoryLocation';
import { MemoryType, MemoryValueOf } from './memory/MemoryTypes';
import {
    IBehaviorContext,
    BehaviorEventType,
    BehaviorEventListener,
    OutputOptions,
    SubscribeOptions,
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

    subscribe(eventType: BehaviorEventType, listener: BehaviorEventListener, options?: SubscribeOptions): Unsubscribe {
        const self = this;
        const handler: IEventHandler = {
            id: `behavior-${this.block.key.toString()}-${eventType}-${Date.now()}`,
            name: `BehaviorHandler-${this.block.label}-${eventType}`,
            handler: (event: IEvent, _runtime: IScriptRuntime): IRuntimeAction[] => {
                // For event callbacks, use the dispatching runtime's live clock
                // instead of the frozen mount-time SnapshotClock. This is critical
                // for tick handlers that need to see current time (e.g., TimerCompletionBehavior).
                const callbackCtx: IBehaviorContext = Object.create(self, {
                    clock: { value: _runtime.clock, enumerable: true, configurable: true }
                });
                return listener(event, callbackCtx);
            }
        };

        // Register with event bus scoped to this block
        const unsub = this.runtime.eventBus.register(
            eventType,
            handler,
            this.block.key.toString(),
            { scope: options?.scope ?? 'active' }
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

        // Derive TimeSpan from block's timer memory for accurate duration tracking.
        // Without this, outputs always have 0 duration which breaks the history
        // and analytics panels.
        const timerLocations = this.block.getMemoryByTag('timer');
        let startTime = now.getTime();
        const endTime = now.getTime();

        if (timerLocations.length > 0) {
            const timerFragments = timerLocations[0].fragments;
            if (timerFragments.length > 0) {
                const timerValue = timerFragments[0].value as { spans?: TimeSpan[] } | undefined;
                if (timerValue?.spans && timerValue.spans.length > 0) {
                    // Use the earliest span start as the output start time
                    startTime = timerValue.spans[0].started;
                }
            }
        }

        // If the caller provided no fragments, pull display fragments from the
        // block's fragment:display memory so the output carries the source
        // label, effort, rep, etc. fragments that the UI needs to render.
        let effectiveFragments = fragments;
        if (effectiveFragments.length === 0) {
            const displayLocations = this.block.getMemoryByTag('fragment:display');
            if (displayLocations.length > 0) {
                effectiveFragments = [...displayLocations[0].fragments];
            }
        }

        // Tag fragments with source block and timestamp
        const taggedFragments = effectiveFragments.map(f => ({
            ...f,
            sourceBlockKey: f.sourceBlockKey ?? this.block.key.toString(),
            timestamp: f.timestamp ?? now
        }));

        // Create the output statement
        const output = new OutputStatement({
            outputType: type,
            timeSpan: new TimeSpan(startTime, endTime),
            sourceBlockKey: this.block.key.toString(),
            sourceStatementId: this.block.sourceIds?.[0],
            stackLevel: this.stackLevel,
            fragments: taggedFragments,
        });

        // Add to runtime's output collection and notify subscribers
        this.addOutputToRuntime(output);
    }

    /**
     * Add output to the runtime's collection and notify subscribers.
     */
    private addOutputToRuntime(output: OutputStatement): void {
        this.runtime.addOutput(output);
    }

    // ============================================================================
    // List-Based Memory API
    // ============================================================================

    pushMemory(tag: MemoryTag, fragments: ICodeFragment[]): IMemoryLocation {
        const location = new MemoryLocation(tag, fragments);
        this.block.pushMemory(location);
        return location;
    }

    updateMemory(tag: MemoryTag, fragments: ICodeFragment[]): void {
        const locations = this.block.getMemoryByTag(tag);
        if (locations.length > 0) {
            locations[0].update(fragments);
        }
    }

    // ============================================================================
    // Backward-Compatible Memory API (shims over list-based memory)
    // ============================================================================

    /**
     * @deprecated Use block.getMemoryByTag() and read fragment values instead.
     * Returns the typed value from the first matching memory location's first fragment.
     */
    getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined {
        const tag = type as string as MemoryTag;
        const locations = this.block.getMemoryByTag(tag);
        if (locations.length === 0) return undefined;
        const loc = locations[0];
        if (loc.fragments.length === 0) return undefined;
        // For typed memory (timer, round, etc.), value is in the first fragment's .value
        return loc.fragments[0]?.value as MemoryValueOf<T>;
    }

    /**
     * @deprecated Use pushMemory() or updateMemory() instead.
     * Updates the first matching location's fragment value, or creates a new one.
     */
    setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
        const tag = type as string as MemoryTag;
        const locations = this.block.getMemoryByTag(tag);
        if (locations.length > 0) {
            const loc = locations[0];
            if (loc.fragments.length > 0) {
                const updated = loc.fragments.map((f, i) =>
                    i === 0 ? { ...f, value } : f
                );
                loc.update(updated);
            } else {
                loc.update([{ fragmentType: 0, type: tag, image: '', origin: 'runtime', value } as any]);
            }
        } else {
            // Create a new location with the value
            this.pushMemory(tag, [{ fragmentType: 0, type: tag, image: '', origin: 'runtime', value } as any]);
        }
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
