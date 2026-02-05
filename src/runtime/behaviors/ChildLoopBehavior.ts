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
        // Check timer state - if timer exists and is not expired, we can loop
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (timer) {
            // Timer exists - loop while timer is running and not expired
            if (timer.isRunning && !timer.isComplete) {
                return true;
            }
            // Timer expired - don't loop
            if (timer.isComplete) {
                return false;
            }
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
