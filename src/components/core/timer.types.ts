import { RuntimeEvent } from "./runtime/timer.runtime";

// TimerDisplay interface to represent the timer's visual state
export interface TimerDisplay {
    elapsed: number;
    remaining?: number;
    
    state: string;
    
    label?: string;
    
    round?: number;
    totalRounds?: number;

    // Display mode flag to determine whether to render in basic or enhanced mode
    displayMode?: 'basic' | 'enhanced';
    
    // Enhanced display properties (optional)
    // Current movement details
    currentMovement?: string;        // Active movement (e.g., "Push-ups")
    targetReps?: number;             // Target repetitions for current movement
    completedReps?: number;          // Completed repetitions
    
    // Visual indicators
    intensity?: "low" | "medium" | "high";  // Workout intensity level
    
    // Timing segments
    workInterval?: number;           // Duration of work interval (seconds)
    restInterval?: number;           // Duration of rest interval (seconds)
    isRestPeriod?: boolean;          // Whether in rest or work period
    
    // Additional workout metrics
    caloriesBurned?: number;         // Estimated calories burned
    movementEfficiency?: number;     // Efficiency measure (0-100%)
    
    // Competition specific
    heatNumber?: number;             // Competition heat number
    laneNumber?: number;             // Athlete lane assignment
    athleteName?: string;            // Athlete name
    
    // Audio cues
    audioAlert?: "start" | "halfway" | "timeWarning" | "finish"; // Audio notification type
}

// For backwards compatibility, we'll keep this as a type alias to the main TimerDisplay
export type EnhancedTimerDisplay = TimerDisplay;


/**
 * Returns all fragments of a specific type from an array of StatementFragments
 * @param fragments Array of StatementFragment objects to filter
 * @param type The type of fragments to retrieve
 * @returns Array of fragments matching the specified type
 */
export function getFragments<T extends StatementFragment>(fragments: StatementFragment[], type: string): T[] {
    return fragments.filter((fragment) => fragment.type === type) as T[];
}

export interface StatementFragment {
    type: string;
    meta?: SourceCodeMetadata;
    toPart: () => string;    
} 

export interface StatementNode {
    id: number;
    parent?: number;
    children: number[];
    meta: SourceCodeMetadata;
    fragments: StatementFragment[];
}

export interface ButtonConfig {
  label?: string;
  icon: React.ForwardRefExoticComponent<React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> & { title?: string, titleId?: string } & React.RefAttributes<SVGSVGElement>>;
  onClick: () => RuntimeEvent[];
  isActive?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
}

export interface SourceCodeMetadata {
    line: number;
    startOffset: number;
    endOffset: number;
    columnStart: number;
    columnEnd: number;
    length: number;
}

export type TimerEventType = 'complete' | 'stop' | 'start' | 'lap';
export type TimerEvent = {
    index: number;
    blockId: number;
    timestamp: Date;
    type: TimerEventType;
}


export class ResultSpan {
    start?: TimerEvent;
    stop?: TimerEvent;
    label?: string;
    duration(timestamp?: Date): number {
        let now = timestamp ?? new Date();
        return ((this.stop?.timestamp ?? now).getTime() || 0) - (this.start?.timestamp.getTime() || 0);
    }
}

export type ElapsedState = {
    elapsed: number;
    duration: number;
    remaining?: number;
    spans?: ResultSpan[];
    state: string;
};




/**
 * Represents a collection of metrics for a workout block
 */
export type WodResultBlock = {
    /** Unique identifier for the runtime block */
    blockId: number;
    /** Position within a sequence of blocks */
    index: number;
    /** Collection of performance metrics */
    metrics: WodMetric[];
    /** When the block execution started */
    startDateTime: Date;
    /** When the block execution completed */
    stopDateTime: Date;
  }
  
  /**
   * Represents individual measurements within a workout block
   */
  export type WodMetric = {
    /** Reference to parent block */
    blockId: number;
    /** Position within the block */
    index: number;  
    /** Metric type (e.g., "reps", "weight", "time") */
    type: string;
    /** Numeric value of the metric */
    value: number;
  }
  
  /**
   * Interface for objects that calculate workout metrics
   */
  export interface WodMetricCalculator {
    /** Add a timer event to the calculation */
    push(event: TimerEvent): void;
    /** Get the calculated metrics */
    results: WodMetric[];
  }
  