import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

/**
 * Calculates total elapsed time from timer spans.
 */
function calculateElapsed(timer: TimerState, now: number): number {
    let total = 0;
    for (const span of timer.spans) {
        const end = span.ended ?? now;
        total += end - span.started;
    }
    return total;
}

/**
 * Formats milliseconds as mm:ss.
 */
function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * TimerOutputBehavior emits timer-specific completion output.
 * 
 * ## Aspect: Output (Timer)
 * 
 * Only emits completion on unmount with elapsed time.
 * Mount-time segment output is NOT emitted here to avoid duplicates
 * with other output behaviors.
 */
export class TimerOutputBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Intentionally empty - segment output is handled by SegmentOutputBehavior
        // or the first behavior to emit. We only add timer data on completion.
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        const now = ctx.clock.now.getTime();

        const elapsed = timer ? calculateElapsed(timer, now) : 0;

        // Start with the block's display fragments (label, effort, reps, etc.)
        // so the output carries meaningful content for the history panel.
        const displayLocs = ctx.block.getMemoryByTag('fragment:display');
        const sourceFragments: ICodeFragment[] = displayLocs.flatMap(loc => loc.fragments);

        // Append the runtime duration fragment
        const durationFragment: ICodeFragment = {
            type: 'duration',
            fragmentType: FragmentType.Timer,
            value: elapsed,
            image: formatDuration(elapsed),
            origin: 'runtime'
        } as ICodeFragment;

        const fragments = [...sourceFragments, durationFragment];

        ctx.emitOutput('completion', fragments, {
            label: `${timer?.label ?? ctx.block.label} - ${formatDuration(elapsed)}`
        });

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
