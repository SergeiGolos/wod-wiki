import { IBehavior } from './IBehavior';

/**
 * CompleteEventBehavior - Handles manual completion signals.
 * 
 * Functions:
 * - Waits for a "Complete" event to be pushed to the event handler
 * - Triggers appropriate completion actions when received
 * 
 * Used By: TimedBlock
 * 
 * Note: There would be a button that would push that to handle on the runtime. 
 * At that point, we end the current span if it is open and we call next on the current block.
 */
export interface ICompleteEventBehavior extends IBehavior {
    /**
     * Check if a complete event has been received
     */
    isCompleteEventReceived(): boolean;
    
    /**
     * Mark the complete event as received
     */
    markCompleteEventReceived(): void;
    
    /**
     * Reset the complete event state
     */
    resetCompleteEventState(): void;
    
    /**
     * Handle the complete event
     */
    handleCompleteEvent(): void;
}