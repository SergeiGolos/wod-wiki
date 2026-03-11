import { MetricOrigin, MetricType, IMetric } from '../../core/models/Metric';
import { IRepSource } from '../contracts/behaviors/IRepSource';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { MemoryTag } from '../memory/MemoryLocation';
import { RoundState } from '../memory/MemoryTypes';
import { IMetricPromoter } from '../contracts/behaviors/IMetricPromoter';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';

export interface PromotionRule {
    metricType: MetricType;
    origin?: MetricOrigin;
    enableDynamicUpdates?: boolean;
    sourceTag?: MemoryTag;
}

export interface MetricPromotionConfig {
    promotions: PromotionRule[];
    repScheme?: number[];
}

export class MetricPromotionBehavior implements IRuntimeBehavior, IRepSource, IMetricPromoter {
    private readonly _repScheme: readonly number[];
    private _lastPromotedRound: number | undefined;

    constructor(private readonly config: MetricPromotionConfig) {
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

    /**
     * Compiler-time promotion handler.
     *
     * Queries current state from parent block memory and returns the
     * correct metrics to be injected into child blocks during JIT
     * compilation. This ensures inheritance works even when a round
     * advances and children are compiled in the same runtime tick.
     */
    getPromotedFragments(runtime: IScriptRuntime, parentBlock: IRuntimeBlock): IMetric[] {
        const metrics: IMetric[] = [];

        // 1. Dynamic rep scheme promotion
        if (this._repScheme.length > 0) {
            const roundState = parentBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
            const round = roundState?.current ?? 1;
            const reps = this.getRepsForRound(round);
            
            if (reps !== undefined) {
                metrics.push({
                    type: MetricType.Rep,
                    image: reps.toString(),
                    origin: 'compiler',
                    value: reps,
                    sourceBlockKey: parentBlock.key.toString(),
                    timestamp: runtime.clock.now,
                });
            }
        }

        // 2. Generic promotion rules
        // For each rule, find the source metrics in parent memory and promote it
        for (const rule of this.config.promotions) {
            const sourceFragment = this.findSourceFragmentInBlock(parentBlock, rule);
            if (sourceFragment) {
                metrics.push({
                    ...sourceFragment,
                    origin: rule.origin ?? 'compiler'
                });
            }
        }

        return metrics;
    }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this._repScheme.length > 0) {
            const round = (ctx.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined)?.current ?? 1;
            this.promoteRepScheme(ctx, round);
        }

        this.promoteFragments(ctx, this.config.promotions);
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        if (this._repScheme.length > 0) {
            const round = ctx.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
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

            const promotedFragment: IMetric = {
                ...sourceFragment,
                origin: rule.origin ?? 'runtime'
            };

            this.upsertPromotedFragment(ctx, promotedFragment);
        }
    }

    private promoteRepScheme(ctx: IBehaviorContext, round: number): void {
        const reps = this.getRepsForRound(round);
        if (reps === undefined) return;

        this._lastPromotedRound = round;

        const repFragment: IMetric = {
            type: MetricType.Rep,
            image: reps.toString(),
            origin: 'runtime',
            value: reps,
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        };

        const existing = ctx.block.getMemoryByTag('metric:rep-target');
        if (existing.length > 0) {
            ctx.updateMemory('metric:rep-target', [repFragment]);
        } else {
            ctx.pushMemory('metric:rep-target', [repFragment]);
        }
    }

    private findSourceFragment(ctx: IBehaviorContext, rule: PromotionRule): IMetric | undefined {
        return this.findSourceFragmentInBlock(ctx.block, rule);
    }

    private findSourceFragmentInBlock(block: IRuntimeBlock, rule: PromotionRule): IMetric | undefined {
        const memory = block.getAllMemory();

        for (const location of memory) {
            if (location.tag === 'metric:promote' || location.tag === 'metric:rep-target') continue;
            if (rule.sourceTag && location.tag !== rule.sourceTag) continue;

            const match = location.metrics.find(metric => metric.type === rule.type);
            if (match) return match;
        }

        return undefined;
    }

    private upsertPromotedFragment(ctx: IBehaviorContext, metric: IMetric): void {
        const existing = ctx.block.getMemoryByTag('metric:promote');

        if (existing.length === 0) {
            ctx.pushMemory('metric:promote', [metric]);
            return;
        }

        const current = existing[0].metrics.filter(
            currentFragment => currentFragment.type !== metric.type
        );

        ctx.updateMemory('metric:promote', [...current, metric]);
    }
}