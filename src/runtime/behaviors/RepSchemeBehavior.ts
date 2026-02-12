import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRepSource } from '../contracts/behaviors/IRepSource';
import { RoundState } from '../memory/MemoryTypes';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

export interface RepSchemeConfig {
    /** The rep scheme array (e.g., [21, 15, 9]) */
    repScheme: number[];
}

/**
 * RepSchemeBehavior promotes rep values from a scheme array to children
 * based on the current round.
 *
 * ## Aspect: Iteration (Rep Distribution)
 *
 * Given a rep scheme like `[21, 15, 9]`, this behavior:
 * - On mount: writes the first round's rep count to `fragment:rep-target` memory
 * - On next: reads the current round and updates `fragment:rep-target` with
 *   the corresponding rep value from the scheme
 *
 * The `fragment:rep-target` memory is read by child blocks during compilation
 * or by other behaviors that need the current round's target reps.
 *
 * Also implements `IRepSource` so that other behaviors or consumers can
 * query `getRepsForRound(n)` or `getRepsForCurrentRound()` via
 * `block.getBehavior(RepSchemeBehavior)`.
 *
 * ## Round-Robin Behavior
 *
 * When the round index exceeds the scheme length, it wraps around:
 * - Round 1 → scheme[0], Round 2 → scheme[1], ...
 * - Round N+1 → scheme[0] (wraps)
 *
 * This supports both fixed-round rep schemes (21-15-9 for 3 rounds)
 * and repeating schemes applied to more rounds than scheme entries.
 */
export class RepSchemeBehavior implements IRuntimeBehavior, IRepSource {
    private readonly _repScheme: readonly number[];
    private _lastPromotedRound: number | undefined;

    constructor(private config: RepSchemeConfig) {
        this._repScheme = [...config.repScheme];
    }

    // ── IRepSource ──────────────────────────────────────────────────

    get repScheme(): readonly number[] {
        return this._repScheme;
    }

    getRepsForRound(round: number): number | undefined {
        if (this._repScheme.length === 0) return undefined;
        // 1-based round → 0-based index, with round-robin wrap
        const index = (round - 1) % this._repScheme.length;
        return this._repScheme[index];
    }

    getRepsForCurrentRound(): number | undefined {
        if (this._lastPromotedRound === undefined) return this._repScheme[0];
        return this.getRepsForRound(this._lastPromotedRound);
    }

    // ── IRuntimeBehavior ────────────────────────────────────────────

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Promote reps for the initial round
        const round = ctx.getMemory('round') as RoundState | undefined;
        const currentRound = round?.current ?? 1;
        this.promoteReps(ctx, currentRound);
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Promote reps for the current round (after RoundAdvanceBehavior
        // has potentially incremented the round counter).
        const round = ctx.getMemory('round') as RoundState | undefined;
        if (!round) return [];

        // Only promote when the round changes (avoid redundant writes
        // on intermediate child completions within the same round).
        if (round.current !== this._lastPromotedRound) {
            this.promoteReps(ctx, round.current);
        }

        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    // ── Private ─────────────────────────────────────────────────────

    /**
     * Writes the rep target for the given round to `fragment:rep-target` memory.
     *
     * Creates a `FragmentType.Rep` fragment with `origin: 'runtime'` so it
     * takes precedence over parser-origin rep fragments when resolved by
     * fragment precedence rules (runtime > parser).
     */
    private promoteReps(ctx: IBehaviorContext, round: number): void {
        const reps = this.getRepsForRound(round);
        if (reps === undefined) return;

        this._lastPromotedRound = round;

        const repFragment: ICodeFragment = {
            fragmentType: FragmentType.Rep,
            type: 'rep',
            image: reps.toString(),
            origin: 'runtime',
            value: reps,
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        };

        // Update or create the rep-target memory location
        const existing = ctx.block.getMemoryByTag('fragment:rep-target');
        if (existing.length > 0) {
            ctx.updateMemory('fragment:rep-target', [repFragment]);
        } else {
            ctx.pushMemory('fragment:rep-target', [repFragment]);
        }
    }
}
