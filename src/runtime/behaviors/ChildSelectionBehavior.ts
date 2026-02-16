import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { PushBlockAction } from '../actions/stack/PushBlockAction';
import { UpdateNextPreviewAction } from '../actions/stack/UpdateNextPreviewAction';
import { ChildrenStatusState, RoundState, TimerState } from '../memory/MemoryTypes';
import { calculateElapsed } from '../time/calculateElapsed';
import { RestBlock } from '../blocks/RestBlock';
import { CurrentRoundFragment } from '../compiler/fragments/CurrentRoundFragment';
import { FragmentType } from '../../core/models/CodeFragment';

export type ChildSelectionLoopCondition = 'always' | 'timer-active' | 'rounds-remaining';

export interface ChildSelectionConfig {
    /** Groups of statement indices to compile and dispatch */
    childGroups: number[][];
    /** Enable looping when all children complete */
    loop?: boolean | {
        /** Loop condition: always, while timer running, or while rounds remain */
        condition?: ChildSelectionLoopCondition;
    };
    /** Inject rest blocks between loop iterations */
    injectRest?: boolean;
    /** Skip first child dispatch on mount (e.g., for deferred start) */
    skipOnMount?: boolean;
}

class CompileChildBlockAction implements IRuntimeAction {
    readonly type = 'compile-child-block';
    readonly target?: string;
    readonly payload?: unknown;

    constructor(private readonly statementIds: number[]) {
        this.payload = { statementIds };
    }

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        if (this.statementIds.length === 0) {
            return [];
        }

        const script = runtime.script;
        const compiler = runtime.jit;
        if (!script || !compiler) {
            return [];
        }

        const statements = this.statementIds
            .map(id => script.getId(id))
            .filter((statement): statement is NonNullable<typeof statement> => statement !== undefined);

        if (statements.length === 0) {
            return [];
        }

        const block = compiler.compile(statements as any, runtime);
        if (!block) {
            return [];
        }

        return [new PushBlockAction(block)];
    }
}

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
            label: this.label,
        });
        return [new PushBlockAction(restBlock)];
    }
}

export class ChildSelectionBehavior implements IRuntimeBehavior {
    private static readonly DEFAULT_MIN_REST_MS = 1000;

    private childIndex = 0;
    private dispatchedOnLastNext = false;
    private restState: 'idle' | 'pending' | 'active' = 'idle';

    constructor(private readonly config: ChildSelectionConfig) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        this.restState = 'idle';
        this.dispatchedOnLastNext = false;

        if (this.config.skipOnMount) {
            const actions: IRuntimeAction[] = [];
            if (this.totalChildren > 0) {
                actions.push(this.createNextPreview(ctx, this.config.childGroups[0]));
            }
            this.writeChildrenStatus(ctx);
            return actions;
        }

        if (this.totalChildren === 0) {
            this.writeChildrenStatus(ctx);
            return [];
        }

        const actions = this.dispatchNext(ctx);
        this.writeChildrenStatus(ctx);
        return actions;
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        this.dispatchedOnLastNext = false;

        if (ctx.block.isComplete) {
            const actions = [this.createNextPreview(ctx)];
            this.writeChildrenStatus(ctx);
            return actions;
        }

        if (this.restState === 'active') {
            this.restState = 'idle';
        }

        if (this.childIndex >= this.totalChildren) {
            if (!this.shouldLoop(ctx)) {
                // All children done, no more loops — mark block complete.
                // RuntimeBlock.next() auto-pop ensures the block is popped.
                this.writeChildrenStatus(ctx);
                ctx.markComplete(
                    this.isLoopEnabled() ? 'rounds-exhausted' : 'children-complete'
                );
                return [this.createNextPreview(ctx)];
            }

            // Cycle complete — advance round counter directly before
            // resetting for the next cycle. This keeps round tracking
            // self-contained: no dependency on ReEntryBehavior ordering.
            this.advanceRound(ctx);
            this.childIndex = 0;

            if (this.shouldInjectRest(ctx)) {
                this.restState = 'pending';
                const restDurationMs = this.getRemainingCountdownMs(ctx);
                const actions: IRuntimeAction[] = [
                    new PushRestBlockAction(restDurationMs, 'Rest'),
                    this.createNextPreview(ctx, this.config.childGroups[0])
                ];
                this.restState = 'active';
                this.writeChildrenStatus(ctx);
                return actions;
            }
        }

        const actions = this.dispatchNext(ctx);
        this.writeChildrenStatus(ctx);
        return actions;
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        this.restState = 'idle';
    }

    get allChildrenExecuted(): boolean {
        return this.childIndex >= this.totalChildren;
    }

    get allChildrenCompleted(): boolean {
        return this.allChildrenExecuted && !this.dispatchedOnLastNext;
    }

    get totalChildren(): number {
        return this.config.childGroups.length;
    }

    private dispatchNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this.childIndex >= this.totalChildren) {
            return [this.createNextPreview(ctx)];
        }

        const nextGroup = this.config.childGroups[this.childIndex];
        this.childIndex++;
        this.dispatchedOnLastNext = true;

        const upcomingGroup = this.config.childGroups[this.childIndex];
        return [
            new CompileChildBlockAction(nextGroup),
            this.createNextPreview(ctx, upcomingGroup),
        ];
    }

    private shouldLoop(ctx: IBehaviorContext): boolean {
        if (ctx.block.isComplete || !this.isLoopEnabled()) {
            return false;
        }

        const condition = this.getLoopCondition();
        if (condition === 'always') {
            return true;
        }

        if (condition === 'timer-active') {
            const timer = ctx.getMemory('timer') as TimerState | undefined;
            if (!timer) {
                return false;
            }

            if (timer.direction === 'down' && timer.durationMs) {
                return this.getRemainingCountdownMs(ctx) > 0;
            }

            return true;
        }

        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) {
            return false;
        }
        if (round.total === undefined) {
            return true;
        }
        return round.current < round.total;
    }

    private shouldInjectRest(ctx: IBehaviorContext): boolean {
        if (!this.config.injectRest) {
            return false;
        }

        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (!timer || timer.direction !== 'down' || !timer.durationMs) {
            return false;
        }

        const remainingMs = this.getRemainingCountdownMs(ctx);
        if (remainingMs < ChildSelectionBehavior.DEFAULT_MIN_REST_MS) {
            return false;
        }

        if (remainingMs >= timer.durationMs) {
            return false;
        }

        return true;
    }

    private getRemainingCountdownMs(ctx: IBehaviorContext): number {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (!timer || timer.direction !== 'down' || !timer.durationMs) {
            return 0;
        }

        const now = ctx.clock.now.getTime();
        const elapsed = calculateElapsed(timer, now);
        return Math.max(0, timer.durationMs - elapsed);
    }

    private writeChildrenStatus(ctx: IBehaviorContext): void {
        const status: ChildrenStatusState = {
            childIndex: this.childIndex,
            totalChildren: this.totalChildren,
            allExecuted: this.allChildrenExecuted,
            allCompleted: this.allChildrenCompleted,
        };

        ctx.setMemory('children:status', status);
    }

    /**
     * Advance the round counter in block memory.
     *
     * Called by this behavior when a complete cycle of children finishes
     * and shouldLoop() returns true. This keeps round tracking
     * self-contained within ChildSelectionBehavior — no dependency on
     * ReEntryBehavior's onNext() or behavior execution ordering.
     *
     * Also refreshes the promoted fragment (fragment:promote) so that
     * child blocks compiled by CompileChildBlockAction in the same
     * onNext() cycle see the updated round value. Without this,
     * FragmentPromotionBehavior (which may have already run earlier in
     * the behavior chain) would leave a stale round in fragment:promote.
     */
    private advanceRound(ctx: IBehaviorContext): void {
        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) return;

        const roundFragment = new CurrentRoundFragment(
            round.current + 1,
            round.total,
            ctx.block.key.toString(),
            ctx.clock.now,
        );

        ctx.updateMemory('round', [roundFragment]);

        // Refresh promoted fragment so child blocks compiled in this
        // cycle see the updated round, regardless of behavior ordering.
        const promoteLocations = ctx.block.getMemoryByTag('fragment:promote');
        if (promoteLocations.length > 0) {
            const otherFragments = promoteLocations[0].fragments.filter(
                f => f.fragmentType !== FragmentType.CurrentRound
            );
            ctx.updateMemory('fragment:promote', [...otherFragments, roundFragment]);
        }
    }

    private createNextPreview(ctx: IBehaviorContext, nextGroup?: number[]): UpdateNextPreviewAction {
        return new UpdateNextPreviewAction(
            ctx.block.key.toString(),
            nextGroup ?? []
        );
    }

    private isLoopEnabled(): boolean {
        if (this.config.loop === undefined) {
            return false;
        }
        if (typeof this.config.loop === 'boolean') {
            return this.config.loop;
        }
        return true;
    }

    private getLoopCondition(): ChildSelectionLoopCondition {
        if (typeof this.config.loop === 'object' && this.config.loop.condition) {
            return this.config.loop.condition;
        }
        return 'timer-active';
    }
}
