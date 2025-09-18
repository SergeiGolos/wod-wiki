import { IBehavior } from './IBehavior';

/**
 * StopOnPopBehavior - Handles cleanup of timer resources.
 * 
 * Functions:
 * - Stops timers on segments when they are popped from the stack
 * - Ensures proper cleanup of timing resources
 * 
 * Used By: RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock
 */
export interface IStopOnPopBehavior extends IBehavior {
    /**
     * Stop all timers associated with this block
     */
    stopTimers(): void;
    
    /**
     * Check if timers are currently running
     */
    areTimersRunning(): boolean;
    
    /**
     * Get list of active timer IDs
     */
    getActiveTimerIds(): string[];
}