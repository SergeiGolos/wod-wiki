import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState, RoundState } from '../memory/MemoryTypes';
import { calculateElapsed } from '../time/calculateElapsed';

/**
 * HistoryRecordBehavior records block execution to workout history.
 * 
 * ## Aspect: Output (History)
 * 
 * On unmount, emits a history:record event with execution details.
 * The runtime or UI layer can subscribe to this to persist history.
 */
export class HistoryRecordBehavior implements IRuntimeBehavior {
    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const now = ctx.clock.now.getTime();

        // Gather execution data
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        const round = ctx.getMemory('round') as RoundState | undefined;

        const record: Record<string, unknown> = {
            blockKey: ctx.block.key.toString(),
            blockType: ctx.block.blockType,
            label: ctx.block.label,
            completedAt: now
        };

        if (timer) {
            record.elapsedMs = calculateElapsed(timer, now);
            record.timerDirection = timer.direction;
            record.timerDurationMs = timer.durationMs;
        }

        if (round) {
            record.completedRounds = round.current - 1;
            record.totalRounds = round.total;
        }

        // Emit history record event
        ctx.emitEvent({
            name: 'history:record',
            timestamp: ctx.clock.now,
            data: record
        });

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
