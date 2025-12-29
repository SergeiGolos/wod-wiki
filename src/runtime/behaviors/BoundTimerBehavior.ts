import { TimerBehavior } from './TimerBehavior';

/**
 * Bound Timer Behavior.
 * Runs a timer for a specified duration and records execution timestamps.
 */
export class BoundTimerBehavior extends TimerBehavior {
    constructor(
        durationMs: number,
        direction: 'up' | 'down' = 'down',
        label: string = 'Timer',
        role: 'primary' | 'secondary' | 'auto' = 'auto',
        autoStart: boolean = true
    ) {
        super(direction, durationMs, label, role, autoStart);
    }
}
