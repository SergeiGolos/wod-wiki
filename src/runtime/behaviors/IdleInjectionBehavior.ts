import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * IdleConfig - Configuration for idle blocks.
 * Preserved during behavior migration.
 */
export interface IdleConfig {
    id: string;
    label: string;
    popOnNext: boolean;
    popOnEvents: string[];
    buttonLabel: string;
    buttonAction: string;
}

/**
 * @deprecated This is a no-op compatibility behavior for idle blocks.
 * It is kept to avoid runtime errors when legacy blocks still reference
 * `new IdleInjectionBehavior()` in their behaviors list.
 * 
 * New code should not use this behavior. Instead, use proper aspect-based
 * behaviors or remove the idle injection pattern entirely.
 * 
 * **Removal Timeline:** This stub will be removed once all legacy blocks
 * have been migrated to the new behavior system.
 */
export class IdleInjectionBehavior implements IRuntimeBehavior {
    /**
     * Lifecycle hook invoked when the behavior is mounted.
     * No-op implementation for compatibility.
     */
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    /**
     * Lifecycle hook invoked when the behavior processes the next step.
     * No-op implementation for compatibility.
     */
    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    /**
     * Lifecycle hook invoked when the behavior is unmounted.
     * No-op implementation for compatibility.
     */
    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
