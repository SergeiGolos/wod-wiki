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
 * TimerOutputBehavior emits timer-specific output statements.
 * 
 * ## Aspect: Output (Timer)
 * 
 * Emits segment on mount with initial timer info,
 * and completion on unmount with elapsed time.
 */
export class TimerOutputBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('timer') as TimerState | undefined;

        const fragments: ICodeFragment[] = [];
        if (timer?.durationMs) {
            fragments.push({
                type: 'duration',
                fragmentType: FragmentType.Timer,
                value: timer.durationMs,
                image: formatDuration(timer.durationMs),
                origin: 'parser'
            } as ICodeFragment);
        }

        ctx.emitOutput('segment', fragments, {
            label: timer?.label ?? ctx.block.label
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        const now = ctx.clock.now.getTime();

        const elapsed = timer ? calculateElapsed(timer, now) : 0;

        const fragments: ICodeFragment[] = [{
            type: 'duration',
            fragmentType: FragmentType.Timer,
            value: elapsed,
            image: formatDuration(elapsed),
            origin: 'runtime'
        } as ICodeFragment];

        ctx.emitOutput('completion', fragments, {
            label: `${timer?.label ?? ctx.block.label} - ${formatDuration(elapsed)}`
        });

        return [];
    }
}
