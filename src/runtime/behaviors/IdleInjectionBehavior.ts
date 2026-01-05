import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { PushIdleBlockAction } from '../actions/stack/PushIdleBlockAction';

export interface IdleConfig {
    id: string;
    label: string;
    popOnNext: boolean;
    popOnEvents: string[];
    buttonLabel: string;
    buttonAction: string;
}

/**
 * IdleInjectionBehavior - Injects idle blocks at workflow transitions.
 * 
 * This behavior manages the injection of idle blocks at specific phases:
 * - 'start': Injects an idle block when the main block is pushed (e.g., "Ready" screen)
 * - 'end': Provides a method to inject an idle block on completion (e.g., "Cooldown" screen)
 * 
 * This is a single-responsibility behavior that only handles idle block injection,
 * not the lifecycle management or button handling of those blocks.
 * 
 * @example
 * ```typescript
 * // Inject a "Ready" idle block on push
 * new IdleInjectionBehavior('start', {
 *     id: 'idle-start',
 *     label: 'Ready',
 *     popOnNext: true,
 *     popOnEvents: [],
 *     buttonLabel: 'Start Workout',
 *     buttonAction: 'timer:start'
 * })
 * ```
 */
export class IdleInjectionBehavior implements IRuntimeBehavior {
    private hasInjectedStartIdle = false;

    constructor(
        private readonly phase: 'start' | 'end',
        private readonly config: IdleConfig
    ) { }

    onPush(_block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        if (this.phase === 'start' && !this.hasInjectedStartIdle) {
            this.hasInjectedStartIdle = true;
            return [this.createIdleBlockAction(clock.now)];
        }
        return [];
    }

    /**
     * Creates and returns an action to inject the end idle block.
     * Called externally by the orchestrating behavior when workout completes.
     */
    injectEndIdle(clock: IRuntimeClock): IRuntimeAction[] {
        if (this.phase === 'end') {
            return [this.createIdleBlockAction(clock.now)];
        }
        return [];
    }

    /**
     * Gets the idle config for external inspection.
     */
    getConfig(): IdleConfig {
        return this.config;
    }

    private createIdleBlockAction(startTime: Date): PushIdleBlockAction {
        // Pass config directly to PushIdleBlockAction (no longer depends on IdleBehavior type)
        return new PushIdleBlockAction(
            this.config.id,
            this.config.label,
            {
                popOnNext: this.config.popOnNext,
                popOnEvents: this.config.popOnEvents,
                buttonLabel: this.config.buttonLabel,
                buttonAction: this.config.buttonAction
            },
            { startTime }
        );
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }
}
