import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { RoundState, TimerState } from '../memory/MemoryTypes';
import { ChildRunnerBehavior } from './ChildRunnerBehavior';

export interface ChildLoopConfig {
    /** Child statement ID groups to loop through */
    childGroups: number[][];
}

/**
 * ChildLoopBehavior enables looping through children while a timer is running.
 * 
 * ## Aspect: Children (Looping)
 * 
 * Works alongside ChildRunnerBehavior. When all children have been executed
 * and the timer is still running (or rounds are unbounded), this behavior
 * resets the ChildRunnerBehavior's child index so it will push the first
 * child on the same onNext() call.
 * 
 * IMPORTANT: This behavior MUST be added BEFORE ChildRunnerBehavior so that
 * it can reset the index before ChildRunner checks it.
 * 
 * Use for AMRAP, EMOM, and other timer-based multi-round workouts.
 */
export class ChildLoopBehavior implements IRuntimeBehavior {
    constructor(private config: ChildLoopConfig) {}

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Get the ChildRunnerBehavior from the block
        const block = ctx.block as IRuntimeBlock;
        const childRunner = block.getBehavior(ChildRunnerBehavior);
        
        if (!childRunner) return [];
        
        // Only act if all children have been executed
        if (!childRunner.allChildrenExecuted) return [];
        
        // Check if we should loop (timer running and not expired)
        if (!this.shouldLoop(ctx)) return [];
        
        // Reset child index for the next iteration
        // ChildRunnerBehavior will then push the first child
        childRunner.resetChildIndex();
        
        // Don't push anything - let ChildRunnerBehavior handle it
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    /**
     * Determine if the block should loop based on timer and round state.
     */
    private shouldLoop(ctx: IBehaviorContext): boolean {
        // If the block is already marked complete (e.g., by TimerCompletionBehavior),
        // never loop — the workout is done.
        const block = ctx.block as IRuntimeBlock;
        if (block.isComplete) {
            return false;
        }

        // Check timer state by computing elapsed from spans
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (timer) {
            // For countdown timers, check if duration has been exceeded
            if (timer.direction === 'down' && timer.durationMs) {
                const now = ctx.clock.now.getTime();
                let elapsed = 0;
                for (const span of timer.spans) {
                    const end = span.ended ?? now;
                    elapsed += end - span.started;
                }
                if (elapsed >= timer.durationMs) {
                    return false; // Timer expired - stop looping
                }
            }
            // Timer exists and not expired - continue looping
            return true;
        }
        
        // Check round state - if unbounded rounds, always loop
        const round = ctx.getMemory('round') as RoundState | undefined;
        if (round) {
            // Unbounded rounds (AMRAP pattern) - loop indefinitely
            if (round.total === undefined) {
                return true;
            }
            // Bounded rounds - loop if more rounds remain
            if (round.current <= round.total) {
                return true;
            }
        }
        
        return false;
    }
}
