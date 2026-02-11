import { IEvent } from './events/IEvent';
import { IRuntimeAction } from './IRuntimeAction';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IRuntimeClock } from './IRuntimeClock';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { OutputStatementType } from '../../core/models/OutputStatement';
import { IMemoryLocation, MemoryTag } from '../memory/MemoryLocation';
import { MemoryType, MemoryValueOf } from '../memory/MemoryTypes';

import { HandlerScope } from './events/IEventBus';

/**
 * Unsubscribe function returned by subscribe().
 */
export type Unsubscribe = () => void;

/**
 * Event types that behaviors can subscribe to.
 */
export type BehaviorEventType = 'tick' | 'next' | 'timer:complete' | 'pause' | 'resume' | '*';

/**
 * Listener function for behavior event subscriptions.
 */
export type BehaviorEventListener = (event: IEvent, ctx: IBehaviorContext) => IRuntimeAction[];

/**
 * Options for subscribing to events.
 */
export interface SubscribeOptions {
    /**
     * Handler scope for this subscription.
     * - `'active'` (default): Only fires when this block is the active (top-of-stack) block
     * - `'bubble'`: Fires when this block is anywhere on the stack (parent hears child events)
     * - `'global'`: Always fires regardless of stack state
     */
    scope?: HandlerScope;
}

/**
 * Options for emitting an output statement.
 */
export interface OutputOptions {
    /** Human-readable label for the output */
    label?: string;

    /**
     * Reason the block completed.
     * 
     * Propagated to OutputStatement so downstream consumers can distinguish:
     * - `'user-advance'` — self-pop (user clicked next)
     * - `'forced-pop'` — parent-pop (parent timer expired, etc.)
     * - `'timer-expired'` — block's own timer completed
     */
    completionReason?: string;
}

/**
 * IBehaviorContext is the unified context object passed to behavior lifecycle hooks.
 * 
 * It provides everything a behavior needs to interact with the runtime:
 * - Access to the block and clock
 * - Event subscription during mount (for tick, next, etc.)
 * - Output emission at any lifecycle point
 * - Typed memory access
 * - Block completion control
 * 
 * ## Design Philosophy
 * 
 * This context replaces the old `(block, clock)` tuple with a richer API that:
 * 1. **Enables event subscription**: Behaviors can register for tick/next events during mount
 * 2. **Supports output emission**: Behaviors emit IOutputStatements at any lifecycle point
 * 3. **Provides typed memory**: Read and write to block-owned memory with type safety
 * 4. **Separates events from outputs**: Events are coordination, outputs are reporting
 * 
 * @example
 * ```typescript
 * class TimerBehavior implements IRuntimeBehavior {
 *   onMount(ctx: IBehaviorContext) {
 *     // Subscribe to tick events
 *     ctx.subscribe('tick', (event, ctx) => {
 *       const timer = ctx.getMemory('timer');
 *       if (timer?.elapsed >= timer?.duration) {
 *         ctx.markComplete('timer:complete');
 *       }
 *       return [];
 *     });
 *     
 *     // Emit segment started output
 *     ctx.emitOutput('segment', [timerFragment], { label: '5:00 countdown' });
 *     
 *     return [];
 *   }
 *   
 *   onUnmount(ctx: IBehaviorContext) {
 *     // Emit completion output
 *     ctx.emitOutput('completion', [elapsedFragment], { label: 'Timer Complete' });
 *     return [];
 *   }
 * }
 * ```
 */
export interface IBehaviorContext {
    // ============================================================================
    // Core References
    // ============================================================================

    /** The block this behavior is attached to */
    readonly block: IRuntimeBlock;

    /** Current runtime clock */
    readonly clock: IRuntimeClock;

    /**
     * Current stack level (depth) of the block.
     * 0 = root block, 1 = first child, etc.
     */
    readonly stackLevel: number;

    // ============================================================================
    // Event Subscription
    // ============================================================================

    /**
     * Subscribe to runtime events.
     * 
     * Subscriptions are automatically cleaned up when the block unmounts.
     * By default, the listener only fires when this block is the active block.
     * Use `{ scope: 'bubble' }` to receive events when a child block is active
     * (e.g., parent timer tracking ticks while children execute).
     * 
     * @param eventType The event type to subscribe to ('tick', 'next', etc.)
     * @param listener The callback to invoke when the event fires
     * @param options Optional settings including handler scope
     * @returns Unsubscribe function (usually not needed as cleanup is automatic)
     * 
     * @example
     * ```typescript
     * onMount(ctx) {
     *   // Active scope (default) — only fires when this block is on top
     *   ctx.subscribe('next', (event, ctx) => {
     *     return [];
     *   });
     *   
     *   // Bubble scope — fires even when a child block is active
     *   ctx.subscribe('tick', (event, ctx) => {
     *     // Track timer even when child effort blocks are executing
     *     return [];
     *   }, { scope: 'bubble' });
     * }
     * ```
     */
    subscribe(eventType: BehaviorEventType, listener: BehaviorEventListener, options?: SubscribeOptions): Unsubscribe;

    // ============================================================================
    // Event Emission
    // ============================================================================

    /**
     * Emit an event to the runtime event bus.
     * 
     * Use this for **coordination** — triggering reactions in other parts of the system.
     * For example: 'timer:started', 'timer:complete', 'pause', 'resume'.
     * 
     * @param event The event to emit
     */
    emitEvent(event: IEvent): void;

    // ============================================================================
    // Output Emission
    // ============================================================================

    /**
     * Emit an output statement.
     * 
     * Use this for **reporting** — recording what happened during execution.
     * Output statements are collected by the runtime and made available to UI/history.
     * 
     * Output can be emitted at any lifecycle point:
     * - onMount: 'segment' started
     * - onNext: 'segment' per iteration, 'milestone' events
     * - onUnmount: 'completion' final results
     * 
     * @param type The type of output ('segment', 'milestone', 'completion', 'metric', 'label')
     * @param fragments The data fragments that make up this output
     * @param options Optional metadata (label)
     * 
     * @example
     * ```typescript
     * // Emit a segment for round 3
     * ctx.emitOutput('segment', [
     *   { fragmentType: FragmentType.Rounds, value: 3, origin: 'runtime' }
     * ], { label: 'Round 3 of 5' });
     * 
     * // Emit completion with elapsed time
     * ctx.emitOutput('completion', [
     *   { fragmentType: FragmentType.Timer, value: elapsed, origin: 'runtime' }
     * ], { label: 'Completed' });
     * ```
     */
    emitOutput(
        type: OutputStatementType,
        fragments: ICodeFragment[],
        options?: OutputOptions
    ): void;

    // ============================================================================
    // Memory Access
    // ============================================================================

    // ============================================================================
    // List-Based Memory API
    // ============================================================================

    /**
     * Push a new memory location with fragment data onto the block's memory list.
     *
     * This creates a new MemoryLocation internally and returns it for potential updates.
     * Multiple locations with the same tag can coexist on the same block.
     *
     * @param tag The memory tag (e.g., 'timer', 'fragment:display')
     * @param fragments The fragment array to store at this location
     * @returns The created memory location for optional further manipulation
     *
     * @example
     * ```typescript
     * // Push timer fragment
     * ctx.pushMemory('timer', [timerFragment]);
     *
     * // Push display row (fragment:display)
     * ctx.pushMemory('fragment:display', [timerFrag, actionFrag, effortFrag]);
     * ```
     */
    pushMemory(tag: MemoryTag, fragments: ICodeFragment[]): IMemoryLocation;

    /**
     * Update the first matching memory location with new fragment data.
     *
     * Convenience method for updating existing memory without managing references.
     * If no location with the given tag exists, this is a no-op.
     *
     * @param tag The memory tag to update
     * @param fragments The new fragment array
     *
     * @example
     * ```typescript
     * // Update timer fragment with new elapsed time
     * ctx.updateMemory('timer', [updatedTimerFragment]);
     * ```
     */
    updateMemory(tag: MemoryTag, fragments: ICodeFragment[]): void;

    // ============================================================================
    // Block Control
    // ============================================================================

    /**
     * Mark the block as complete.
     * 
     * When marked complete, the block will be popped from the stack
     * during the next completion sweep.
     * 
     * @param reason Optional reason for completion (for debugging/history)
     */
    markComplete(reason?: string): void;

    // ============================================================================
    // Backward-Compatible Memory API (shims over list-based memory)
    // ============================================================================

    /**
     * @deprecated Use block.getMemoryByTag() and read fragment values instead.
     * Returns the typed value from the first matching memory location's first fragment.
     */
    getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined;

    /**
     * @deprecated Use pushMemory() or updateMemory() instead.
     * Updates the first matching memory location's fragment value, or creates a new one.
     */
    setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void;
}
