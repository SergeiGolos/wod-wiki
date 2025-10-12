import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { TypedMemoryReference } from '../IMemoryReference';

/**
 * TimeSpan interface for timer tracking.
 * Represents a segment of time with start and optional stop timestamps.
 */
export interface TimeSpan {
  start?: Date;
  stop?: Date;
}

/**
 * Action for declaratively starting a timer.
 * 
 * This action manages timer start logic by adding a new TimeSpan
 * to the time spans array without requiring direct memory manipulation.
 * 
 * @example
 * ```typescript
 * // Start timer with current timestamp
 * return [new StartTimerAction(timeSpansRef)];
 * 
 * // Start timer with custom timestamp
 * return [new StartTimerAction(timeSpansRef, new Date('2025-01-01'))];
 * ```
 */
export class StartTimerAction implements IRuntimeAction {
  readonly type = 'start-timer';
  
  constructor(
    /** Reference to TimeSpan[] memory where timer state is stored */
    public readonly timeSpansRef: TypedMemoryReference<TimeSpan[]>,
    /** Optional timestamp (defaults to now) */
    public readonly timestamp: Date = new Date()
  ) {}

  do(runtime: IScriptRuntime): void {
    const spans = this.timeSpansRef.get() || [];
    
    // Add new time span with start time
    spans.push({
      start: this.timestamp,
      stop: undefined  // No stop time yet (running)
    });
    
    this.timeSpansRef.set(spans);
  }
}
