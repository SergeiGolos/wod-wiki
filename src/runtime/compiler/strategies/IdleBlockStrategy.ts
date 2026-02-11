import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import { RuntimeButton } from '../../models/MemoryModels';
import { BlockBuilder } from '../BlockBuilder';

// Specific behaviors not covered by aspect composers
import {
    TimerInitBehavior,
    PopOnNextBehavior,
    PopOnEventBehavior,
    DisplayInitBehavior,
    ButtonBehavior
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
 * Uses aspect composer methods (when applicable):
 * - .asTimer() - Track idle duration (if trackTiming enabled)
 * Plus specific behaviors for display, controls, and completion.
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
        const blockKey = new BlockKey(config.id);
        const context = new BlockContext(runtime, blockKey.toString(), 'Idle');

        // Use BlockBuilder with aspect composers
        const builder = new BlockBuilder(runtime);
        builder
            .setContext(context)
            .setKey(blockKey)
            .setBlockType('Idle')
            .setLabel(config.label)
            .setSourceIds([]); // No source IDs for idle block

        this.composeBehaviors(builder, config);

        return builder.build();
    }

    /**
     * Composes behaviors for an idle block using aspect composers.
     */
    private composeBehaviors(builder: BlockBuilder, config: IdleBlockConfig): void {
        // =====================================================================
        // ASPECT COMPOSERS - High-level composition
        // =====================================================================

        // Timer Aspect - Track idle duration (if enabled)
        if (config.trackTiming) {
            builder.asTimer({
                direction: 'up',
                label: config.label,
                role: 'secondary',
                addCompletion: false  // No timer completion for idle blocks
            });
        }

        // =====================================================================
        // Specific Behaviors - Not covered by aspect composers
        // =====================================================================

        // Completion Aspect
        if (config.popOnNext) {
            builder.addBehavior(new PopOnNextBehavior());
        }

        if (config.popOnEvents && config.popOnEvents.length > 0) {
            builder.addBehavior(new PopOnEventBehavior(config.popOnEvents));
        }

        // Display Aspect
        builder.addBehavior(new DisplayInitBehavior({
            mode: config.displayMode || 'clock',
            label: config.label
        }));

        // Controls Aspect
        if (config.button) {
            builder.addBehavior(new ButtonBehavior({
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
    }

    /**
     * Builds the behavior list for an idle block (deprecated).
     * @deprecated Use build() method which uses BlockBuilder with aspect composers
     */
    buildBehaviors(config: IdleBlockConfig): IRuntimeBehavior[] {
        throw new Error('buildBehaviors is deprecated. Use build() method instead.');
    }
}

/**
 * Default instance for convenience.
 */
export const idleBlockStrategy = new IdleBlockStrategy();
