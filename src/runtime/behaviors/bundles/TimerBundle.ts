import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { BoundTimerBehavior } from '../BoundTimerBehavior';
import { UnboundTimerBehavior } from '../UnboundTimerBehavior';
import { SoundBehavior } from '../SoundBehavior';
import { TimerPauseResumeBehavior } from '../TimerPauseResumeBehavior';
import { createCountdownSoundCues } from '../../compiler/strategies/TimerStrategy';
import { StrategyBasedCompletionBehavior } from '../../completion/StrategyBasedCompletionBehavior';
import { TimerCompletionStrategy } from '../../completion/TimerCompletionStrategy';

export interface TimerBundleConfig {
    direction: 'up' | 'down';
    durationMs?: number;
    enableSound?: boolean;
    enablePauseResume?: boolean;
    label?: string;
}

/**
 * TimerBundle - Coordinated timer behavior bundle that consolidates timer state management.
 * 
 * **Purpose:**
 * Addresses timer state management overlap by providing a single configuration point for
 * all timer-related behaviors. This bundle ensures consistent timer setup and reduces the
 * risk of conflicting timer manipulations across multiple behaviors.
 * 
 * **Encapsulated Behaviors:**
 * - Timer behavior (bound or unbound) - Primary timer logic
 * - Sound cues (optional) - Countdown sounds coordinated with timer
 * - Completion detection (for bounded timers) - Automatic completion when timer expires
 * - Pause/Resume handling (optional) - UI controls for timer pause/resume
 * 
 * **Timer State Coordination:**
 * The bundle ensures that:
 * 1. Only one TimerBehavior instance manages the core timer state
 * 2. Related behaviors (sound, completion) reference the same timer instance
 * 3. Pause/resume operations are coordinated through a single handler
 * 4. No conflicting timer manipulations occur
 * 
 * **Best Practices:**
 * - Use this bundle instead of manually composing timer behaviors
 * - Do not add additional TimerBehavior instances to blocks using this bundle
 * - Timer-specific behaviors (IntervalTimerRestartBehavior) should be added after this bundle
 * 
 * @example
 * ```typescript
 * // Countdown timer with sound and pause/resume
 * const behaviors = [
 *     new ActionLayerBehavior(...),
 *     ...TimerBundle.create({
 *         direction: 'down',
 *         durationMs: 60000,
 *         enableSound: true,
 *         enablePauseResume: true
 *     }),
 *     new HistoryBehavior(...)
 * ];
 * ```
 * 
 * @see https://github.com/SergeiGolos/wod-wiki/blob/main/docs/BEHAVIOR_OVERLAP_AND_RACE_CONDITIONS_ASSESSMENT.md#73-high-priority-consolidate-timer-state-management
 */
export class TimerBundle {
    /**
     * Creates a coordinated set of timer behaviors.
     * 
     * @param config - Timer configuration
     * @returns Array of behaviors in correct initialization order
     */
    static create(config: TimerBundleConfig): IRuntimeBehavior[] {
        const behaviors: IRuntimeBehavior[] = [];
        const label = config.label || 'Timer';
        
        // 1. Timer behavior (bound or unbound) - MUST be first for other behaviors to reference
        const timer = config.durationMs
            ? new BoundTimerBehavior(config.durationMs, config.direction, label)
            : new UnboundTimerBehavior(label);
        behaviors.push(timer);
        
        // 2. Pause/Resume handling (optional) - Coordinates with timer instance
        if (config.enablePauseResume !== false) {  // Default to true
            behaviors.push(new TimerPauseResumeBehavior());
        }
        
        // 3. Sound (optional, for countdown timers only)
        if (config.enableSound && config.direction === 'down' && config.durationMs) {
            behaviors.push(new SoundBehavior({
                direction: 'down',
                durationMs: config.durationMs,
                cues: createCountdownSoundCues(config.durationMs)
            }));
        }
        
        // 4. Completion detection (for bounded timers only) - uses strategy pattern
        if (config.durationMs) {
            behaviors.push(new StrategyBasedCompletionBehavior(
                new TimerCompletionStrategy(timer)
            ));
        }
        
        return behaviors;
    }
}
