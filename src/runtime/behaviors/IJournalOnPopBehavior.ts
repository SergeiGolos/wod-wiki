import { IBehavior } from './IBehavior';

/**
 * JournalOnPopBehavior - Records metrics and spans to persistent storage.
 * 
 * Functions:
 * - Writes metrics and spans for the block to long-term memory
 * - Currently implemented as a service creating a separate list
 * 
 * Used By: RootBlock, TimeBoundBlock, TimedBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock
 */
export interface IJournalOnPopBehavior extends IBehavior {
    /**
     * Write metrics and spans to journal storage
     */
    writeToJournal(): void;
    
    /**
     * Get the journal entries for this block
     */
    getJournalEntries(): any[];
    
    /**
     * Check if journaling is enabled
     */
    isJournalingEnabled(): boolean;
    
    /**
     * Set journaling enabled state
     */
    setJournalingEnabled(enabled: boolean): void;
}