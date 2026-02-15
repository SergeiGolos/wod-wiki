import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { calculateElapsed } from '../time/calculateElapsed';
import { ElapsedFragment } from '../compiler/fragments/ElapsedFragment';
import { TotalFragment } from '../compiler/fragments/TotalFragment';
import { SpansFragment } from '../compiler/fragments/SpansFragment';
import { SystemTimeFragment } from '../compiler/fragments/SystemTimeFragment';

/**
 * TimerOutputBehavior writes timer-specific result fragments to memory.
 * 
 * ## Aspect: Output (Timer)
 * 
 * On unmount, computes time values from timer spans and writes
 * typed time fragments to `fragment:result` memory:
 * - **SpansFragment** — raw start/stop timestamps
 * - **ElapsedFragment** — sum of active span durations
 * - **TotalFragment** — wall-clock bracket from first start to last end
 * - **SystemTimeFragment** — actual system time (Date.now()) for audit
 * 
 * `SegmentOutputBehavior` reads `fragment:result` during its `onUnmount`
 * and merges result fragments into the single `completion` output.
 * 
 * ## fragment:result contract
 * 
 * By writing to `fragment:result`, this behavior explicitly declares
 * which time fragments should be included in the block's completion output.
 * Blocks that don't need timer results simply omit this behavior.
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
        const blockKey = ctx.block.key.toString();
        const clockNow = ctx.clock.now;

        const fragments: ICodeFragment[] = [];

        if (timer && timer.spans.length > 0) {
            // Elapsed: sum of active span durations
            const elapsed = calculateElapsed(timer, now);
            fragments.push(new ElapsedFragment(elapsed, blockKey, clockNow));

            // Total: wall-clock bracket from first start to last end
            const firstStart = timer.spans[0].started;
            const lastSpan = timer.spans[timer.spans.length - 1];
            const lastEnd = lastSpan.ended ?? now;
            const total = Math.max(0, lastEnd - firstStart);
            fragments.push(new TotalFragment(total, blockKey, clockNow));

            // Spans: raw start/stop timestamps
            fragments.push(new SpansFragment([...timer.spans], blockKey, clockNow));
        }

        // System time: actual Date.now() for audit trail
        // This is independent of the IRuntimeClock which may be frozen/faked
        fragments.push(new SystemTimeFragment(new Date(), blockKey));

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
