import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IEvent } from '../IEvent';

/**
 * Action for declarative event emission from behaviors.
 * 
 * This action allows behaviors to emit events through the action system
 * instead of calling runtime.handle() directly, maintaining declarative patterns.
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
  
  constructor(
    /** Name of the event to emit */
    public readonly eventName: string,
    /** Optional data to include with the event */
    public readonly data?: unknown,
    /** Optional timestamp (defaults to now) */
    public readonly timestamp: Date = new Date()
  ) {}

  do(runtime: IScriptRuntime): void {
    const event: IEvent = {
      name: this.eventName,
      timestamp: this.timestamp,
      data: this.data
    };
    
    runtime.handle(event);
  }
}
