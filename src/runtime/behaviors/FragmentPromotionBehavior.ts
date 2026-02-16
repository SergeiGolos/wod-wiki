import { FragmentOrigin, FragmentType, ICodeFragment } from '../../core/models/CodeFragment';
import { IRepSource } from '../contracts/behaviors/IRepSource';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { MemoryTag } from '../memory/MemoryLocation';
import { RoundState } from '../memory/MemoryTypes';

export interface PromotionRule {
    fragmentType: FragmentType;
    origin?: FragmentOrigin;
    enableDynamicUpdates?: boolean;
    sourceTag?: MemoryTag;
}

export interface FragmentPromotionConfig {
    promotions: PromotionRule[];
    repScheme?: number[];
}

export class FragmentPromotionBehavior implements IRuntimeBehavior, IRepSource {
    private readonly _repScheme: readonly number[];
    private _lastPromotedRound: number | undefined;

    constructor(private readonly config: FragmentPromotionConfig) {
        this._repScheme = [...(config.repScheme ?? [])];
    }

    get repScheme(): readonly number[] {
        return this._repScheme;
    }

    getRepsForRound(round: number): number | undefined {
        if (this._repScheme.length === 0) return undefined;
        const index = (round - 1) % this._repScheme.length;
        return this._repScheme[index];
    }

    getRepsForCurrentRound(): number | undefined {
        if (this._lastPromotedRound === undefined) {
            return this._repScheme[0];
        }

        return this.getRepsForRound(this._lastPromotedRound);
    }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this._repScheme.length > 0) {
            const round = (ctx.getMemory('round') as RoundState | undefined)?.current ?? 1;
            this.promoteRepScheme(ctx, round);
        }

        this.promoteFragments(ctx, this.config.promotions);
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this._repScheme.length > 0) {
            const round = ctx.getMemory('round') as RoundState | undefined;
            if (round && round.current !== this._lastPromotedRound) {
                this.promoteRepScheme(ctx, round.current);
            }
        }

        const dynamicPromotions = this.config.promotions.filter(rule => rule.enableDynamicUpdates);
        this.promoteFragments(ctx, dynamicPromotions);
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
    }

    private promoteFragments(ctx: IBehaviorContext, rules: PromotionRule[]): void {
        for (const rule of rules) {
            const sourceFragment = this.findSourceFragment(ctx, rule);
            if (!sourceFragment) continue;

            const promotedFragment: ICodeFragment = {
                ...sourceFragment,
                origin: rule.origin ?? 'execution'
            };

            this.upsertPromotedFragment(ctx, promotedFragment);
        }
    }

    private promoteRepScheme(ctx: IBehaviorContext, round: number): void {
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

        const existing = ctx.block.getMemoryByTag('fragment:rep-target');
        if (existing.length > 0) {
            ctx.updateMemory('fragment:rep-target', [repFragment]);
        } else {
            ctx.pushMemory('fragment:rep-target', [repFragment]);
        }
    }

    private findSourceFragment(ctx: IBehaviorContext, rule: PromotionRule): ICodeFragment | undefined {
        const memory = ctx.block.getAllMemory();

        for (const location of memory) {
            if (location.tag === 'fragment:promote' || location.tag === 'fragment:rep-target') continue;
            if (rule.sourceTag && location.tag !== rule.sourceTag) continue;

            const match = location.fragments.find(fragment => fragment.fragmentType === rule.fragmentType);
            if (match) return match;
        }

        return undefined;
    }

    private upsertPromotedFragment(ctx: IBehaviorContext, fragment: ICodeFragment): void {
        const existing = ctx.block.getMemoryByTag('fragment:promote');

        if (existing.length === 0) {
            ctx.pushMemory('fragment:promote', [fragment]);
            return;
        }

        const current = existing[0].fragments.filter(
            currentFragment => currentFragment.fragmentType !== fragment.fragmentType
        );

        ctx.updateMemory('fragment:promote', [...current, fragment]);
    }
}