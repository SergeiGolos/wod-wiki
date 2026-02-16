import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { FragmentType, ICodeFragment } from '../../core/models/CodeFragment';

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
        const fragments = roundLabel ? [...staticLabels, roundLabel] : staticLabels;

        if (fragments.length > 0) {
            ctx.pushMemory('display', fragments);
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

        const currentFragments = existingDisplay[0].fragments.filter(
            fragment => !this.isRoundRoleFragment(fragment)
        );

        ctx.updateMemory('display', [...currentFragments, roundLabel]);
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
    }

    private createStaticLabels(ctx: IBehaviorContext): ICodeFragment[] {
        const label = this.config.label ?? ctx.block.label;
        const subtitle = this.config.subtitle;
        const actionDisplay = this.config.actionDisplay;
        const fragments: ICodeFragment[] = [];

        if (label) {
            fragments.push(this.createTextFragment(ctx, label, 'label'));
        }

        if (subtitle) {
            fragments.push(this.createTextFragment(ctx, subtitle, 'subtitle'));
        }

        if (actionDisplay) {
            fragments.push(this.createTextFragment(ctx, actionDisplay, 'action'));
        }

        return fragments;
    }

    private createRoundLabel(ctx: IBehaviorContext): ICodeFragment | undefined {
        if (this.config.showRoundDisplay === false) return undefined;

        const roundLocation = ctx.block.getMemoryByTag('round')[0];
        if (!roundLocation || roundLocation.fragments.length === 0) return undefined;

        const roundValue = roundLocation.fragments[0].value as { current?: number; total?: number } | undefined;
        if (!roundValue || typeof roundValue.current !== 'number') return undefined;

        const roundLabel = this.formatRound(roundValue.current, roundValue.total);
        return this.createTextFragment(ctx, roundLabel, 'round');
    }

    private createTextFragment(
        ctx: IBehaviorContext,
        text: string,
        role: 'label' | 'subtitle' | 'action' | 'round'
    ): ICodeFragment {
        return {
            fragmentType: FragmentType.Text,
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

    private isRoundRoleFragment(fragment: ICodeFragment): boolean {
        const value = fragment.value as { role?: string } | undefined;
        return value?.role === 'round';
    }
}