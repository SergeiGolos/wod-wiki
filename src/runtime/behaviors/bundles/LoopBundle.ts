import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { RoundPerNextBehavior } from '../RoundPerNextBehavior';
import { RoundPerLoopBehavior } from '../RoundPerLoopBehavior';
import { BoundLoopBehavior } from '../BoundLoopBehavior';
import { ChildIndexBehavior } from '../ChildIndexBehavior';
import { ChildRunnerBehavior } from '../ChildRunnerBehavior';
import { RepSchemeBehavior } from '../RepSchemeBehavior';
import { RoundDisplayBehavior } from '../RoundDisplayBehavior';
import { RoundSpanBehavior } from '../RoundSpanBehavior';
import { LapTimerBehavior } from '../LapTimerBehavior';

export interface LoopBundleConfig {
    totalRounds: number;
    repScheme?: number[];
    children: number[][];
    loopMode: 'perNext' | 'perLoop';
    spanLabel?: string;
}

/**
 * LoopBundle - Pre-configured behavior bundle for loop-based blocks.
 * 
 * Encapsulates common looping patterns including:
 * - Round tracking (perNext or perLoop mode)
 * - Loop completion detection
 * - Child execution management
 * - Rep scheme support (optional)
 * - Round display and tracking
 * - Lap timing
 * 
 * @example
 * ```typescript
 * // 5 rounds with rep scheme
 * const behaviors = [
 *     ...LoopBundle.create({
 *         totalRounds: 5,
 *         repScheme: [21, 15, 9],
 *         children: [[1], [2], [3]],
 *         loopMode: 'perLoop'
 *     })
 * ];
 * ```
 */
export class LoopBundle {
    static create(config: LoopBundleConfig): IRuntimeBehavior[] {
        const behaviors: IRuntimeBehavior[] = [];
        
        // 1. Round tracking - choose mode
        behaviors.push(
            config.loopMode === 'perNext'
                ? new RoundPerNextBehavior()
                : new RoundPerLoopBehavior()
        );
        
        // 2. Loop completion control
        behaviors.push(new BoundLoopBehavior(config.totalRounds));
        
        // 3. Child execution management
        behaviors.push(new ChildIndexBehavior(config.children.length));
        behaviors.push(new ChildRunnerBehavior(config.children));
        
        // 4. Rep scheme (optional)
        if (config.repScheme && config.repScheme.length > 0) {
            behaviors.push(new RepSchemeBehavior(config.repScheme));
        }
        
        // 5. Display & tracking
        behaviors.push(new RoundDisplayBehavior(config.totalRounds));
        behaviors.push(new RoundSpanBehavior(
            config.spanLabel || 'rounds',
            config.repScheme,
            config.totalRounds
        ));
        behaviors.push(new LapTimerBehavior());
        
        return behaviors;
    }
}
