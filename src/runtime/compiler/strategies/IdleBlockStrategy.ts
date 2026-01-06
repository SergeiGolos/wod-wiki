import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { RuntimeBlock } from '../../RuntimeBlock';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '../../../core/models/BlockKey';
import { RuntimeButton } from '../../models/MemoryModels';

// Behaviors
import { RuntimeControlsBehavior } from '../../behaviors/RuntimeControlsBehavior';
import { TimerBehavior } from '../../behaviors/TimerBehavior';
import { PopOnNextBehavior } from '../../behaviors/PopOnNextBehavior';
import { PopOnEventBehavior } from '../../behaviors/PopOnEventBehavior';
import { SingleButtonBehavior } from '../../behaviors/SingleButtonBehavior';
import { TransitionTimingBehavior } from '../../behaviors/TransitionTimingBehavior';
import { DisplayModeBehavior } from '../../behaviors/DisplayModeBehavior';

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
 * This strategy builds idle blocks using single-responsibility behaviors:
 * - TransitionTimingBehavior: Tracks time spent in idle state
 * - RuntimeControlsBehavior: Manages button/control memory
 * - TimerBehavior: Provides timer display
 * - DisplayModeBehavior: Sets display mode
 * - PopOnNextBehavior: Pops on next (if configured)
 * - PopOnEventBehavior: Pops on specific events (if configured)
 * - SingleButtonBehavior: Registers a button (if configured)
 * 
 * @example
 * ```typescript
 * const strategy = new IdleBlockStrategy();
 * const block = strategy.build(runtime, {
 *     id: 'idle-start',
 *     label: 'Ready',
 *     popOnNext: true,
 *     button: {
 *         id: 'btn-start',
 *         label: 'Start Workout',
 *         icon: 'play',
 *         action: 'timer:start',
 *         variant: 'default',
 *         size: 'lg'
 *     }
 * });
 * ```
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
    apply(_builder: any, _statements: ICodeStatement[], _runtime: IScriptRuntime): void {
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

        // 1. Timing tracking (optional, defaults to true)
        if (config.trackTiming !== false) {
            behaviors.push(new TransitionTimingBehavior());
        }

        // 2. Controls allocation
        behaviors.push(new RuntimeControlsBehavior());

        // 3. Timer for display (secondary timer)
        behaviors.push(new TimerBehavior('up', undefined, config.label, 'secondary'));

        // 4. Display mode
        behaviors.push(new DisplayModeBehavior(config.displayMode ?? 'clock'));

        // 5. Pop behaviors
        if (config.popOnNext) {
            behaviors.push(new PopOnNextBehavior());
        }

        if (config.popOnEvents && config.popOnEvents.length > 0) {
            behaviors.push(new PopOnEventBehavior(config.popOnEvents));
        }

        // 6. Button (if provided)
        if (config.button) {
            behaviors.push(new SingleButtonBehavior(config.button));
        }

        return behaviors;
    }
}

/**
 * Default instance for convenience.
 */
export const idleBlockStrategy = new IdleBlockStrategy();
