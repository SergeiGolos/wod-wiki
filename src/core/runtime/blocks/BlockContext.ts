import { ITimerRuntime, ITimeSpan } from "@/core/timer.types";

/**
 * Holds all mutable state for a runtime block, separating state from behavior
 * for improved testability and adherence to SOLID principles.
 */
export class BlockContext {
  /** The timer runtime instance */
  runtime: ITimerRuntime;
  
  /** Counter for completed iterations/rounds */
  index: number = 0;
  
  /** Child index for nested blocks (for repeating blocks) */
  childIndex?: number;
  
  /** Last lap separator character (for repeating blocks with lap fragments) */
  lastLap?: string;
  
  /** Time spans for this block */
  spans: ITimeSpan[] = [];
  
  constructor(params: Partial<BlockContext> = {}) {
    this.runtime = params.runtime || {} as ITimerRuntime;
    this.index = params.index || 0;
    this.childIndex = params.childIndex;
    this.lastLap = params.lastLap;
    this.spans = params.spans || [];
  }
}
