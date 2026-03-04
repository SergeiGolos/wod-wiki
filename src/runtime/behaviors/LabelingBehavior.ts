import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { MetricType, IMetric } from '../../core/models/Metric';

export interface LabelingConfig {
    mode?: 'clock' | 'timer' | 'countdown' | 'hidden';
    label?: string;
    subtitle?: string;
    actionDisplay?: string;
    showRoundDisplay?: boolean;
    roundFormat?: (current: number, total?: number) => string;
}

export class LabelingBehavior implements IRuntimeBehavior {
    constructor(private readonly config: LabelingConfig = {}) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const staticLabels = this.createStaticLabels(ctx);
        const roundLabel = this.createRoundLabel(ctx);
        const metrics = roundLabel ? [...staticLabels, roundLabel] : staticLabels;

        if (metrics.length > 0) {
            ctx.pushMemory('display', metrics);
        }

        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const roundLabel = this.createRoundLabel(ctx);
        if (!roundLabel) return [];

        const existingDisplay = ctx.block.getMemoryByTag('display');
        if (existingDisplay.length === 0) {
            ctx.pushMemory('display', [roundLabel]);
            return [];
        }

        const currentFragments = existingDisplay[0].metrics.filter(
            metric => !this.isRoundRoleFragment(metric)
        );

        ctx.updateMemory('display', [...currentFragments, roundLabel]);
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
    }

    private createStaticLabels(ctx: IBehaviorContext): IMetric[] {
        const label = this.config.label ?? ctx.block.label;
        const subtitle = this.config.subtitle;
        const actionDisplay = this.config.actionDisplay;
        const metrics: IMetric[] = [];

        if (label) {
            metrics.push(this.createTextMetric(ctx, label, 'label'));
        }

        if (subtitle) {
            metrics.push(this.createTextMetric(ctx, subtitle, 'subtitle'));
        }

        if (actionDisplay) {
            metrics.push(this.createTextMetric(ctx, actionDisplay, 'action'));
        }

        return metrics;
    }

    private createRoundLabel(ctx: IBehaviorContext): IMetric | undefined {
        if (this.config.showRoundDisplay === false) return undefined;

        const roundLocation = ctx.block.getMemoryByTag('round')[0];
        if (!roundLocation || roundLocation.metrics.length === 0) return undefined;

        const roundValue = roundLocation.metrics[0] as { current?: number; total?: number };
        if (!roundValue || typeof roundValue.current !== 'number') return undefined;

        const roundLabel = this.formatRound(roundValue.current, roundValue.total);
        return this.createTextMetric(ctx, roundLabel, 'round');
    }

    private createTextMetric(
        ctx: IBehaviorContext,
        text: string,
        role: 'label' | 'subtitle' | 'action' | 'round'
    ): IMetric {
        return {
            metricType: MetricType.Text,
            type: 'text',
            image: text,
            origin: 'runtime',
            value: { text, role },
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        };
    }

    private formatRound(current: number, total?: number): string {
        if (this.config.roundFormat) {
            return this.config.roundFormat(current, total);
        }

        if (typeof total === 'number') {
            return `Round ${current} of ${total}`;
        }

        return `Round ${current}`;
    }

    private isRoundRoleFragment(metric: IMetric): boolean {
        const value = metric.value as { role?: string } | undefined;
        return value?.role === 'round';
    }
}