import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { calculateElapsed, formatDuration } from '../time/calculateElapsed';

/**
 * TimerOutputBehavior writes timer-specific tracked fragments to memory.
 * 
 * ## Aspect: Output (Timer)
 * 
 * On unmount, computes elapsed time from timer spans and writes a
 * `FragmentType.Timer` duration fragment to `fragment:tracked` memory.
 * 
 * `SegmentOutputBehavior` reads `fragment:tracked` during its `onUnmount`
 * and merges tracked fragments into the single `completion` output.
 * This avoids duplicate completion outputs (S6) and ensures runtime-tracked
 * fragments are consistently included in leaf completions (S5).
 */
export class TimerOutputBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Intentionally empty - segment output is handled by SegmentOutputBehavior
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        const now = ctx.clock.now.getTime();

        const elapsed = timer ? calculateElapsed(timer, now) : 0;

        // Create the runtime duration fragment
        const durationFragment: ICodeFragment = {
            type: 'duration',
            fragmentType: FragmentType.Timer,
            value: elapsed,
            image: formatDuration(elapsed),
            origin: 'runtime'
        } as ICodeFragment;

        // Write to fragment:tracked memory so SegmentOutputBehavior can
        // merge it into the single completion output (S5/S6 fix).
        ctx.pushMemory('fragment:tracked', [durationFragment]);

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
