import type { IMemoryReference } from '../memory';
import { IRuntimeEvent } from '../EventHandler';
import { IRuntimeBlock } from '../IRuntimeBlock';

/**
 * Interface for loop state stored in memory
 */
export interface LoopState {
    remainingRounds: number;
    currentChildIndex: number;
    childStatements: any[];
}

/**
 * Contract for blocks that iterate children across rounds or laps.
 */
export interface IRepeatingBlockBehavior {
    /**
     * Memory allocations (private unless noted)
     * - loop-state: { remainingRounds, currentChildIndex, childStatements }
     * - segments.total: number (private)
     * - segments.per-round: number (private)  
     * - segments.round-index: number (private)
     * - segments.total-index: number (private)
     * - Optional public: current-round (public number) if children need to see the round index
     */
    
    /**
     * Check if there are more children to process
     */
    hasNextChild(): boolean;
    
    /**
     * Advance to the next child in the iteration
     */
    advanceToNextChild(): void;
    
    /**
     * Get the current loop state from memory
     */
    getLoopState(): LoopState;
    
    /**
     * Set the current loop state in memory
     */
    setLoopState(state: LoopState): void;
    
    /**
     * Reset the loop state to initial values
     */
    reset(): void;
}