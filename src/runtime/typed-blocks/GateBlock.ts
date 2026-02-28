import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';
import { LeafBlock } from './LeafBlock';

export interface GateBlockConfig {
    label?: string;
    sourceIds?: number[];
    planFragments?: ICodeFragment[];
    /** Button configurations for UI display */
    buttons?: Array<{
        id: string;
        label: string;
        eventName?: string;
    }>;
}

/**
 * GateBlock — a pure user-input gate.
 *
 * Does nothing until the user advances (clicks "Start", "Next", etc.).
 * Completes immediately on next().
 *
 * Replaces: WaitingToStartBlock + LeafExitBehavior + ButtonBehavior
 * Archetype: Gate (no timer, no children, no rounds)
 */
export class GateBlock extends LeafBlock {
    constructor(runtime: IScriptRuntime, config: GateBlockConfig = {}) {
        super(runtime, {
            blockType: 'Gate',
            label: config.label ?? 'Ready',
            sourceIds: config.sourceIds,
            planFragments: config.planFragments,
        });

        // Add button action fragments to the bucket
        const buttons = config.buttons ?? [{ id: 'start', label: 'Start', eventName: 'next' }];
        for (const btn of buttons) {
            this.fragments.add({
                fragmentType: FragmentType.Action,
                type: 'action',
                image: btn.label,
                origin: 'compiler',
                behavior: MetricBehavior.Defined,
                value: {
                    id: btn.id,
                    label: btn.label,
                    eventName: btn.eventName ?? 'next',
                    variant: 'primary',
                    visible: true,
                    enabled: true,
                },
            });
        }
    }

    protected onMount(_runtime: IScriptRuntime, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        // Gate just sits and waits. No timer, no children.
        return [];
    }

    // onNext inherited from LeafBlock: marks complete → auto-pop
}
