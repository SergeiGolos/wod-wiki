import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { IEvent } from '../../contracts/events/IEvent';
import { ActionPhase, IPhasedAction } from '../ActionPhase';

/**
 * Action for declarative event emission from behaviors.
 * 
 * This action allows behaviors to emit events through the action system
 * instead of calling runtime.handle() directly, maintaining declarative patterns.
 * 
 * This action is in the EVENT phase, meaning all display, memory, and side effect
 * actions will complete before events are dispatched. This prevents event handlers
 * from triggering stack mutations mid-lifecycle.
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
export class EmitEventAction implements IPhasedAction {
  readonly type = 'emit-event';
  readonly phase = ActionPhase.EVENT;
  
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
