import { IBehavior } from './IBehavior';

/**
 * EndOnPopBehavior - Terminates program execution upon block completion.
 * 
 * Functions:
 * - Ends program execution when the block completes
 * - Ensures clean program termination
 * 
 * Used By: RootBlock
 */
export interface IEndOnPopBehavior extends IBehavior {
    /**
     * Check if program should end on pop
     */
    shouldEndOnPop(): boolean;
    
    /**
     * Mark the program for ending on pop
     */
    markForEndOnPop(): void;
    
    /**
     * Trigger program termination
     */
    triggerProgramEnd(): void;
    
    /**
     * Reset the end on pop state
     */
    resetEndOnPopState(): void;
}