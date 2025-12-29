import { TimerBehavior } from './TimerBehavior';

/**
 * Unbound Timer Behavior.
 * Runs a timer "up" and records execution timestamps.
 * No duration limit.
 */
export class UnboundTimerBehavior extends TimerBehavior {
    constructor(
        label: string = 'Timer',
        role: 'primary' | 'secondary' | 'auto' = 'auto',
        autoStart: boolean = true
    ) {
        super('up', undefined, label, role, autoStart);
    }
}
