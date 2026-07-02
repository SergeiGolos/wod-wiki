import type { IRuntimeAction } from "@/runtime/contracts/IRuntimeAction";
import type { IRuntimeContext } from "@/runtime/contracts/IRuntimeContext";
import type { IEvent } from "@/runtime/contracts/events/IEvent";
import { INowProvider, wallClockNow } from "@/runtime/INowProvider";

/**
 * Action for declarative event emission from behaviors.
 * 
 * This action allows behaviors to emit events through the action system
 * using eventBus.emit(), maintaining declarative patterns.
 * 
 * @example
 * ```typescript
 * // Emit a timer start event
 * return [new EmitEventAction('timer:started')];
 * 
 * // Emit event with custom data
 * return [new EmitEventAction('rounds:completed', { round: 5 })];
 * 
 * // Emit event with custom timestamp
 * return [new EmitEventAction('workout:finished', undefined, new Date())];
 * ```
 */
export class EmitEventAction implements IRuntimeAction {
  readonly type = 'emit-event';
  public readonly timestamp: Date;

  constructor(
    /** Name of the event to emit */
    public readonly eventName: string,
    /** Optional data to include with the event */
    public readonly data?: unknown,
    /** Optional timestamp (defaults to now) */
    timestamp?: Date,
    now: INowProvider = wallClockNow,
  ) {
    this.timestamp = timestamp ?? now.now();
  }

  do(runtime: IRuntimeContext): IRuntimeAction[] {
    const event: IEvent = {
      name: this.eventName,
      timestamp: this.timestamp,
      data: this.data
    };
    
    return runtime.eventBus.dispatch(event, runtime);
  }
}
