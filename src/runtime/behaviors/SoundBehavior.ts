import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * Legacy sound memory type constant.
 * @deprecated Use SoundCueBehavior instead.
 */
export const SOUND_MEMORY_TYPE = 'sound-state';

/**
 * SoundBehavior - Legacy sound cue behavior.
 * 
 * @deprecated Use SoundCueBehavior instead. This is a legacy stub
 * maintained for backward compatibility with existing code.
 * 
 * ## Migration
 * Replace 'new SoundBehavior(config)' with:
 * - 'new SoundCueBehavior(config)' - For sound cue triggers
 * 
 * @see SoundCueBehavior
 */
export class SoundBehavior implements IRuntimeBehavior {
    constructor(_config?: unknown) {
        // Legacy stub - config is intentionally unused
    }

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Legacy stub - does nothing
        // Use SoundCueBehavior for sound cues
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }
}
