import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { TypedMemoryReference } from '../IMemoryReference';
import { TimeSpan } from './StartTimerAction';

/**
 * Action for declaratively stopping a timer.
 * 
 * This action manages timer stop logic by setting the stop timestamp
 * on the most recent TimeSpan in the array.
 * 
 * @example
 * ```typescript
 * // Stop timer with current timestamp
 * return [new StopTimerAction(timeSpansRef)];
 * 
 * // Stop timer with custom timestamp
 * return [new StopTimerAction(timeSpansRef, new Date('2025-01-01'))];
 * ```
 */
export class StopTimerAction implements IRuntimeAction {
  readonly type = 'stop-timer';
  
  constructor(
    /** Reference to TimeSpan[] memory where timer state is stored */
    public readonly timeSpansRef: TypedMemoryReference<TimeSpan[]>,
    /** Optional timestamp (defaults to now) */
    public readonly timestamp: Date = new Date()
  ) {}

  do(runtime: IScriptRuntime): void {
    const spans = this.timeSpansRef.get() || [];
    
    // Find the last span without a stop time (the running span)
    const runningSpan = spans.find(span => span.start && !span.stop);
    
    if (runningSpan) {
      runningSpan.stop = this.timestamp;
      this.timeSpansRef.set(spans);
    }
  }
}
