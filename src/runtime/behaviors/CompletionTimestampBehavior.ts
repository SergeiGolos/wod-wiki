import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

/**
 * CompletionTimestampBehavior records when a block is marked as complete.
 *
 * ## Universal Invariant
 *
 * This behavior is automatically added to ALL blocks by BlockBuilder.
 * It records the completion timestamp when the block's isComplete flag is set to true.
 * The timestamp is stored in block memory under the 'completion' tag.
 */
export class CompletionTimestampBehavior implements IRuntimeBehavior {
    private completionTime: Date | undefined;
    private wasComplete = false;

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Check if block was just marked complete and we haven't recorded the timestamp yet
        const blockState = (ctx.block as any).state;
        if (blockState && blockState.isComplete && !this.wasComplete && !this.completionTime) {
            this.completionTime = new Date(ctx.clock.now);
            this.wasComplete = true;

            // Push completion timestamp to memory
            const completionFragment: ICodeFragment = {
                fragmentType: FragmentType.Timer,  // Use Timer instead of Metric
                type: 'completion',
                image: this.completionTime.toISOString(),
                origin: 'runtime',
                value: {
                    completedAt: this.completionTime.getTime(),
                    timestamp: this.completionTime
                },
                sourceBlockKey: ctx.block.key.toString(),
                timestamp: ctx.clock.now,
            };

            ctx.pushMemory('completion', [completionFragment]);
        }
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    /**
     * Get the completion timestamp if the block has been completed.
     * @returns Completion timestamp or undefined
     */
    getCompletionTime(): Date | undefined {
        return this.completionTime;
    }
}
