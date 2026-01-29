import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { RuntimeBlock } from '../../RuntimeBlock';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import { RuntimeButton } from '../../models/MemoryModels';

// Aspect-based behaviors
import {
    TimerInitBehavior,
    TimerTickBehavior,
    PopOnNextBehavior,
    PopOnEventBehavior,
    DisplayInitBehavior,
    ControlsInitBehavior
} from '../../behaviors';

/**
 * Configuration for idle blocks.
 */
export interface IdleBlockConfig {
    /** Unique identifier for the idle block */
    id: string;
    /** Display label for the idle block */
    label: string;
    /** Whether to pop on next() call */
    popOnNext?: boolean;
    /** Events that trigger pop */
    popOnEvents?: string[];
    /** Button to display (optional) */
    button?: RuntimeButton;
    /** Whether to track timing metrics */
    trackTiming?: boolean;
    /** Display mode (clock or timer) */
    displayMode?: 'clock' | 'timer';
}

/**
 * IdleBlockStrategy - Composes behaviors for idle/transition blocks.
 * 
 * Uses aspect-based behaviors:
 * - Time: TimerInit (countup), TimerTick
 * - Completion: PopOnNext or PopOnEvent
 * - Display: DisplayInit
 * - Controls: ControlsInit
 */
export class IdleBlockStrategy implements IRuntimeBlockStrategy {
    priority = 100; // Root is highest priority if it were ever matched

    /**
     * Root blocks are not matched from statements - they are created directly.
     */
    match(_statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return false;
    }

    /**
     * Composable apply - not used for root blocks.
     */
    apply(_builder: unknown, _statements: ICodeStatement[], _runtime: IScriptRuntime): void {
        // No-op for direct build
    }

    /**
     * Builds an idle block with the specified configuration.
     */
    build(runtime: IScriptRuntime, config: IdleBlockConfig): IRuntimeBlock {
        const behaviors = this.buildBehaviors(config);
        const blockKey = new BlockKey(config.id);
        const context = new BlockContext(runtime, blockKey.toString(), 'Idle');

        return new RuntimeBlock(
            runtime,
            [], // No source IDs for idle block
            behaviors,
            context,
            blockKey,
            'Idle',
            config.label
        );
    }

    /**
     * Builds the behavior list for an idle block.
     */
    buildBehaviors(config: IdleBlockConfig): IRuntimeBehavior[] {
        const behaviors: IRuntimeBehavior[] = [];

        // =====================================================================
        // Time Aspect - Track idle duration
        // =====================================================================
        if (config.trackTiming) {
            behaviors.push(new TimerInitBehavior({
                direction: 'up',
                label: config.label,
                role: 'secondary'
            }));
            behaviors.push(new TimerTickBehavior());
        }

        // =====================================================================
        // Completion Aspect
        // =====================================================================
        if (config.popOnNext) {
            behaviors.push(new PopOnNextBehavior());
        }

        if (config.popOnEvents && config.popOnEvents.length > 0) {
            behaviors.push(new PopOnEventBehavior(config.popOnEvents));
        }

        // =====================================================================
        // Display Aspect
        // =====================================================================
        behaviors.push(new DisplayInitBehavior({
            mode: config.displayMode || 'clock',
            label: config.label
        }));

        // =====================================================================
        // Controls Aspect
        // =====================================================================
        if (config.button) {
            behaviors.push(new ControlsInitBehavior({
                buttons: [{
                    id: config.button.id,
                    label: config.button.label,
                    variant: 'primary',
                    visible: true,
                    enabled: true,
                    eventName: config.button.action
                }]
            }));
        }

        return behaviors;
    }
}

/**
 * Default instance for convenience.
 */
export const idleBlockStrategy = new IdleBlockStrategy();
