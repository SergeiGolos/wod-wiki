import { IBehavior } from './IBehavior';

/**
 * OnEventEndBehavior - Handles program termination from external events.
 * 
 * Functions:
 * - Processes external end events
 * - Ensures proper shutdown of workout program
 * 
 * Used By: RootBlock
 */
export interface IOnEventEndBehavior extends IBehavior {
    /**
     * Check if an end event has been received
     */
    isEndEventReceived(): boolean;
    
    /**
     * Mark the end event as received
     */
    markEndEventReceived(): void;
    
    /**
     * Reset the end event state
     */
    resetEndEventState(): void;
    
    /**
     * Handle the end event and trigger shutdown
     */
    handleEndEvent(): void;
}