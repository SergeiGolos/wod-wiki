import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext, Unsubscribe } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { PopBlockAction } from '../actions/stack/PopBlockAction';

export interface ExitConfig {
    /**
     * `immediate` — pop as soon as trigger fires (replaces LeafExitBehavior).
     * `deferred`  — pop on next() only when block is already marked complete
     *               (replaces CompletedBlockPopBehavior; used by container blocks
     *                where a timer or event marks completion externally).
     */
    mode: 'immediate' | 'deferred';
    /**
     * For `mode: 'immediate'` — pop when next() is called.
     * Defaults to `true` for immediate mode.
     */
    onNext?: boolean;
    /**
     * For `mode: 'immediate'` — pop when any of these events fires.
     * Defaults to `[]`.
     */
    onEvents?: string[];
}

/**
 * ExitBehavior unifies the two completion-pop patterns into a single behavior.
 *
 * ## Modes
 *
 * ### `immediate`
 * Pops the block as soon as a trigger fires:
 * - `onNext: true` (default) — pops when the user calls next()
 * - `onEvents: ['timer:complete']` — pops when the event fires
 * Both can be active simultaneously.
 *
 * Replaces `LeafExitBehavior`.
 *
 * ### `deferred`
 * Pops the block on the next call to next() *only if* `block.isComplete`
 * is already true. Used on container blocks where an external trigger
 * (timer expiry, event) marks completion, but the block should only pop
 * once all in-flight children have had a chance to run.
 *
 * Replaces `CompletedBlockPopBehavior`.
 *
 * ## Migration
 *
 * ```typescript
 * // Before:
 * new LeafExitBehavior({ onNext: true })
 * new LeafExitBehavior({ onEvents: ['timer:complete'] })
 * new LeafExitBehavior({ onNext: true, onEvents: ['timer:start'] })
 * new CompletedBlockPopBehavior()
 *
 * // After:
 * new ExitBehavior({ mode: 'immediate' })
 * new ExitBehavior({ mode: 'immediate', onNext: false, onEvents: ['timer:complete'] })
 * new ExitBehavior({ mode: 'immediate', onNext: true, onEvents: ['timer:start'] })
 * new ExitBehavior({ mode: 'deferred' })
 * ```
 */
export class ExitBehavior implements IRuntimeBehavior {
    private readonly config: Required<ExitConfig>;
    private unsubscribers: Unsubscribe[] = [];

    constructor(config: ExitConfig) {
        this.config = {
            mode: config.mode,
            onNext: config.onNext ?? (config.mode === 'immediate' ? true : false),
            onEvents: config.onEvents ?? [],
        };
    }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this.config.mode !== 'immediate') {
            return [];
        }

        for (const eventName of this.config.onEvents) {
            const unsubscribe = ctx.subscribe(eventName as any, (event, eventCtx) => {
                eventCtx.markComplete(`event:${event.name}`);
                return [new PopBlockAction()];
            });
            this.unsubscribers.push(unsubscribe);
        }

        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this.config.mode === 'deferred') {
            if (ctx.block.isComplete) {
                return [new PopBlockAction()];
            }
            return [];
        }

        // immediate mode
        if (!this.config.onNext) {
            return [];
        }

        // Only mark user-advance if the block hasn't already been completed
        // by another mechanism (e.g., timer-expired auto-pop via NextAction).
        if (!ctx.block.isComplete) {
            ctx.markComplete('user-advance');
        }
        return [new PopBlockAction()];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        for (const unsubscribe of this.unsubscribers) {
            unsubscribe();
        }
        this.unsubscribers = [];
    }
}
