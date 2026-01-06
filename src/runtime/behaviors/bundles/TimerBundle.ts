import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { BoundTimerBehavior } from '../BoundTimerBehavior';
import { UnboundTimerBehavior } from '../UnboundTimerBehavior';
import { CompletionBehavior } from '../CompletionBehavior';
import { SoundBehavior } from '../SoundBehavior';
import { createCountdownSoundCues } from '../../compiler/strategies/TimerStrategy';

export interface TimerBundleConfig {
    direction: 'up' | 'down';
    durationMs?: number;
    enableSound?: boolean;
    label?: string;
}

/**
 * TimerBundle - Pre-configured behavior bundle for timer-based blocks.
 * 
 * Encapsulates common timer patterns including:
 * - Timer behavior (bound or unbound)
 * - Sound cues (optional, for countdown timers)
 * - Completion detection (for bounded timers)
 * 
 * @example
 * ```typescript
 * // Countdown timer with sound
 * const behaviors = [
 *     ...TimerBundle.create({
 *         direction: 'down',
 *         durationMs: 60000,
 *         enableSound: true
 *     })
 * ];
 * ```
 */
export class TimerBundle {
    static create(config: TimerBundleConfig): IRuntimeBehavior[] {
        const behaviors: IRuntimeBehavior[] = [];
        const label = config.label || 'Timer';
        
        // 1. Timer behavior (bound or unbound)
        const timer = config.durationMs
            ? new BoundTimerBehavior(config.durationMs, config.direction, label)
            : new UnboundTimerBehavior(label);
        behaviors.push(timer);
        
        // 2. Sound (optional, for countdown timers only)
        if (config.enableSound && config.direction === 'down' && config.durationMs) {
            behaviors.push(new SoundBehavior({
                direction: 'down',
                durationMs: config.durationMs,
                cues: createCountdownSoundCues(config.durationMs)
            }));
        }
        
        // 3. Completion detection (for bounded timers only)
        if (config.durationMs) {
            behaviors.push(new CompletionBehavior(
                (_block, now) => timer.isComplete(now),
                ['timer:tick', 'timer:complete']
            ));
        }
        
        return behaviors;
    }
}
