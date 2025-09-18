import type { IMemoryReference } from '../memory';
import { IBehavior } from './IBehavior';

/**
 * DurationEventBehavior - Manages timed segments within a workout.
 * 
 * Functions:
 * - Creates duration events that listen to tick events
 * - Determines if the span associated with the event has elapsed
 * - Triggers internal event functions when duration completes
 * 
 * Used By: TimeBoundBlock, TimeBoundedLoopingBlock
 */
export interface IDurationEventBehavior extends IBehavior {
    /**
     * Memory allocations:
     * - duration (private): number - duration in milliseconds
     * - start-time (private): Date - start time of the duration
     * - elapsed-time (private): number - elapsed time in milliseconds
     */
    
    /**
     * Get the duration in milliseconds
     */
    getDuration(): number;
    
    /**
     * Set the duration in milliseconds
     */
    setDuration(duration: number): void;
    
    /**
     * Get the start time
     */
    getStartTime(): Date | undefined;
    
    /**
     * Set the start time
     */
    setStartTime(startTime: Date): void;
    
    /**
     * Get the elapsed time in milliseconds
     */
    getElapsedTime(): number;
    
    /**
     * Check if the duration has elapsed
     */
    hasDurationElapsed(): boolean;
    
    /**
     * Start the duration timer
     */
    startDuration(): void;
    
    /**
     * Stop the duration timer
     */
    stopDuration(): void;
    
    /**
     * Tick the duration (update elapsed time)
     */
    tickDuration(currentTime?: Date): boolean;
    
    /**
     * Get the duration memory reference
     */
    getDurationReference(): IMemoryReference<number> | undefined;
}