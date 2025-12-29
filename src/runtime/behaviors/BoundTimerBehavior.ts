import { TimerBehavior } from './TimerBehavior';

/**
 * Bound Timer Behavior.
 * Runs a timer for a specific duration.
 * Typically counts down ('down').
 */
export class BoundTimerBehavior extends TimerBehavior {
    constructor(durationMs: number, label: string = 'Timer', autoStart: boolean = true) {
        super('down', durationMs, label, 'primary', autoStart);
    }
}
