import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { IEvent } from '../contracts/events/IEvent';
import { TimerBehavior } from './TimerBehavior';
import { SetWorkoutStateAction } from '../actions/display/WorkoutStateActions';
import { RegisterButtonAction, UnregisterButtonAction } from '../actions/display/ControlActions';

/**
 * TimerPauseResumeBehavior - Handles pause/resume events for timers.
 * 
 * Listens for timer:pause and timer:resume events and:
 * 1. Pauses/resumes the TimerBehavior
 * 2. Updates the workout state
 * 3. Swaps pause/resume buttons
 * 
 * This is a single-responsibility behavior that only handles pause/resume,
 * not overall timer lifecycle or other controls.
 * 
 * @example
 * ```typescript
 * // Add to block to enable pause/resume handling
 * new TimerPauseResumeBehavior()
 * ```
 */
export class TimerPauseResumeBehavior implements IRuntimeBehavior {
    readonly priority = 150; // Pre-execution: after timer
    onEvent(event: IEvent, block: IRuntimeBlock): IRuntimeAction[] {
        const timer = block.getBehavior(TimerBehavior);
        if (!timer) return [];

        const timestamp = event.timestamp ?? new Date();

        switch (event.name) {
            case 'timer:pause':
                timer.pause(timestamp);
                return [
                    new SetWorkoutStateAction('paused'),
                    new UnregisterButtonAction('btn-pause'),
                    new RegisterButtonAction({
                        id: 'btn-resume',
                        label: 'Resume',
                        icon: 'play',
                        action: 'timer:resume',
                        variant: 'default',
                        size: 'lg'
                    })
                ];

            case 'timer:resume':
                timer.resume(timestamp);
                return [
                    new SetWorkoutStateAction('running'),
                    new UnregisterButtonAction('btn-resume'),
                    new RegisterButtonAction({
                        id: 'btn-pause',
                        label: 'Pause',
                        icon: 'pause',
                        action: 'timer:pause',
                        variant: 'default',
                        size: 'lg'
                    })
                ];
        }

        return [];
    }

    onPush(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }
}
