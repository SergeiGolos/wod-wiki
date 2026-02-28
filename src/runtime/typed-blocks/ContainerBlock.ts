import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';
import { TypedBlock, TypedBlockConfig } from './TypedBlock';
import { CompileAndPushBlockAction } from '../actions/stack/CompileAndPushBlockAction';

/**
 * Loop condition determines when a container re-iterates its children.
 */
export type LoopCondition = 'never' | 'always' | 'timer-active' | 'rounds-remaining';

export interface ContainerBlockConfig extends TypedBlockConfig {
    /** Groups of statement IDs to compile and push as children */
    childGroups: number[][];
    /** How to loop through children */
    loopCondition?: LoopCondition;
    /** Total number of rounds (undefined = unbounded) */
    totalRounds?: number;
    /** Starting round number (default: 1) */
    startRound?: number;
    /** Whether to skip first child dispatch on mount */
    skipFirstChild?: boolean;
}

/**
 * Abstract base class for container blocks — blocks that dispatch children.
 *
 * Manages a cursor (`childIndex`) over `childGroups`, compiles children
 * via the JIT compiler, handles looping, and tracks round state.
 *
 * Subclasses override:
 * - `onChildrenExhausted()` — what to do when all children in a round complete
 * - `onTimerExpired()` — what to do when a timer fires (for timer-bearing containers)
 * - `shouldLoop()` — custom loop condition logic
 */
export abstract class ContainerBlock extends TypedBlock {
    protected readonly childGroups: number[][];
    protected childIndex = 0;
    protected currentRound: number;
    protected readonly totalRounds: number | undefined;
    protected readonly loopCondition: LoopCondition;
    private readonly _skipFirstChild: boolean;

    constructor(runtime: IScriptRuntime, config: ContainerBlockConfig) {
        super(runtime, config);

        this.childGroups = config.childGroups;
        this.loopCondition = config.loopCondition ?? 'never';
        this.totalRounds = config.totalRounds;
        this.currentRound = config.startRound ?? 1;
        this._skipFirstChild = config.skipFirstChild ?? false;

        // Add round fragment to bucket
        this.syncRoundFragment();
    }

    // ========================================================================
    // Round State
    // ========================================================================

    /** Advance to the next round */
    protected advanceRound(): void {
        this.currentRound++;
        this.syncRoundFragment();
    }

    private syncRoundFragment(): void {
        const roundFragment: ICodeFragment = {
            fragmentType: FragmentType.CurrentRound,
            type: 'current-round',
            image: this.totalRounds
                ? `Round ${this.currentRound}/${this.totalRounds}`
                : `Round ${this.currentRound}`,
            origin: 'runtime',
            behavior: MetricBehavior.Recorded,
            value: { current: this.currentRound, total: this.totalRounds },
        };
        this.fragments.replaceByType(FragmentType.CurrentRound, [roundFragment]);
    }

    // ========================================================================
    // Child Dispatch
    // ========================================================================

    /** Whether there are more children to dispatch in this round */
    protected get hasNextChild(): boolean {
        return this.childIndex < this.childGroups.length;
    }

    /**
     * Compile and push the next child group.
     * Returns a CompileAndPushBlockAction for the next child, or empty if exhausted.
     */
    protected dispatchNextChild(options?: BlockLifecycleOptions): IRuntimeAction[] {
        if (!this.hasNextChild) return [];

        const nextGroup = this.childGroups[this.childIndex];
        this.childIndex++;

        return [new CompileAndPushBlockAction(nextGroup, options ?? {})];
    }

    /** Reset child cursor for the next round */
    protected resetChildCursor(): void {
        this.childIndex = 0;
    }

    // ========================================================================
    // Loop Logic
    // ========================================================================

    /** Check if children should loop for another round */
    protected shouldLoop(): boolean {
        switch (this.loopCondition) {
            case 'never':
                return false;
            case 'always':
                return true;
            case 'rounds-remaining':
                return this.totalRounds === undefined || this.currentRound < this.totalRounds;
            case 'timer-active':
                // Subclasses with timers override this or check their timer
                return !this.isComplete;
            default:
                return false;
        }
    }

    // ========================================================================
    // Default Lifecycle
    // ========================================================================

    protected onMount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const actions = this.onContainerMount(runtime, options);

        // Dispatch first child unless skipping
        if (!this._skipFirstChild) {
            actions.push(...this.dispatchNextChild(options));
        }

        return actions;
    }

    /**
     * Called when a child completes and control returns to this container.
     * Default: dispatch next child, or loop, or complete.
     */
    protected onNext(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        // If already complete (e.g., timer expired), just pop
        if (this.isComplete) return [];

        // More children in this round?
        if (this.hasNextChild) {
            return this.dispatchNextChild(options);
        }

        // All children exhausted — should we loop?
        if (this.shouldLoop()) {
            this.resetChildCursor();
            this.advanceRound();
            return this.onLoopRestart(runtime, options);
        }

        // Done
        this.markComplete('children-complete');
        return [];
    }

    protected onUnmount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        return [];
    }

    // ========================================================================
    // Hooks for subclasses
    // ========================================================================

    /** Called during onMount before first child dispatch. Override for setup. */
    protected onContainerMount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        return [];
    }

    /** Called when children loop for a new round. Override for rest injection, etc. */
    protected onLoopRestart(_runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        return this.dispatchNextChild(options);
    }
}
