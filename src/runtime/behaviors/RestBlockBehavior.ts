import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { TimerState } from '../memory/MemoryTypes';
import { PushBlockAction } from '../actions/stack/PushBlockAction';
import { RestBlock } from '../blocks/RestBlock';
import { ChildRunnerBehavior } from './ChildRunnerBehavior';

export interface RestBlockBehaviorConfig {
    /** Minimum rest duration in ms. Rests shorter than this are skipped. Default: 1000 (1s). */
    minRestMs?: number;
    /** Label for auto-generated rest blocks. Default: "Rest". */
    label?: string;
}

/**
 * PushRestBlockAction creates and pushes a RestBlock onto the runtime stack.
 *
 * Uses the action pattern so the RestBlock can be constructed with the
 * IScriptRuntime (which behaviors don't have direct access to).
 */
class PushRestBlockAction implements IRuntimeAction {
    readonly type = 'push-rest-block';
    readonly target?: string;
    readonly payload?: unknown;

    constructor(
        private readonly durationMs: number,
        private readonly label: string = 'Rest'
    ) {
        this.payload = { durationMs, label };
    }

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        const restBlock = new RestBlock(runtime, {
            durationMs: this.durationMs,
            label: this.label
        });
        return [new PushBlockAction(restBlock)];
    }
}

/**
 * RestBlockBehavior auto-generates rest blocks between exercises in
 * timer-based workout patterns (EMOM, AMRAP with rest).
 *
 * ## Aspect: Children (Rest Insertion)
 *
 * When all child exercises have been executed and the parent's countdown
 * timer still has remaining time, this behavior pushes a RestBlock for
 * the remaining duration. The rest block counts down and auto-pops,
 * after which the parent's normal looping/round-advance behaviors proceed.
 *
 * ## Behavior Chain Order
 *
 * This behavior MUST be added BEFORE ChildLoopBehavior and ChildRunnerBehavior
 * in the behavior chain. It has Priority Order 0 so it runs first during
 * onNext(). When a rest block is pushed, ChildLoopBehavior checks
 * `isRestPending` and skips its reset.
 *
 * ## State Machine
 *
 * - `idle`: No rest pending. Check conditions on next().
 * - `rest-pending`: Rest block was pushed. Waiting for it to complete.
 *   On the next onNext() call (rest completed), transitions back to `idle`.
 *
 * ## Applies To
 *
 * EMOM blocks, AMRAP blocks (where exercises finish before interval expires).
 */
export class RestBlockBehavior implements IRuntimeBehavior {
    private _isRestPending = false;
    private readonly _minRestMs: number;
    private readonly _label: string;

    constructor(config: RestBlockBehaviorConfig = {}) {
        this._minRestMs = config.minRestMs ?? 1000;
        this._label = config.label ?? 'Rest';
    }

    /**
     * Whether a rest block has been pushed and is awaiting completion.
     * ChildLoopBehavior checks this to avoid resetting the child index
     * while rest is active.
     */
    get isRestPending(): boolean {
        return this._isRestPending;
    }

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // If rest was pending, the rest block just completed.
        // Clear the flag and let other behaviors (ChildLoop, RoundAdvance) proceed.
        if (this._isRestPending) {
            this._isRestPending = false;
            return [];
        }

        // Only insert rest when all children have been executed
        const block = ctx.block as IRuntimeBlock;
        const childRunner = block.getBehavior(ChildRunnerBehavior);
        if (!childRunner || !childRunner.allChildrenExecuted) {
            return [];
        }

        // Calculate remaining time on the parent's countdown timer
        const remainingMs = this.calculateRemainingMs(ctx);
        if (remainingMs < this._minRestMs) {
            return []; // Not enough time for rest — proceed normally
        }

        // Skip rest insertion when the timer was just reset by
        // TimerCompletionBehavior (interval pattern). After a reset,
        // remaining ≈ full duration because elapsed ≈ 0. Inserting
        // rest for the full interval would be incorrect — only insert
        // rest when exercises finish early within an interval.
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (timer?.durationMs && remainingMs >= timer.durationMs) {
            return []; // Timer just reset — skip rest insertion
        }

        // Push a rest block for the remaining time
        this._isRestPending = true;
        return [new PushRestBlockAction(remainingMs, this._label)];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        this._isRestPending = false;
    }

    /**
     * Calculate remaining milliseconds on the block's countdown timer.
     * Returns 0 if no countdown timer is present or timer is expired.
     */
    private calculateRemainingMs(ctx: IBehaviorContext): number {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (!timer || timer.direction !== 'down' || !timer.durationMs) {
            return 0;
        }

        const now = ctx.clock.now.getTime();
        let elapsed = 0;
        for (const span of timer.spans) {
            const end = span.ended ?? now;
            elapsed += end - span.started;
        }

        return Math.max(0, timer.durationMs - elapsed);
    }
}
