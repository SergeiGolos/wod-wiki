import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

/**
 * Action for declaratively unregistering an event handler.
 * 
 * This action manages event handler cleanup by removing the handler
 * from runtime memory, preventing further event processing.
 * 
 * @example
 * ```typescript
 * // Unregister a handler during block disposal
 * return [new UnregisterEventHandlerAction(handlerId)];
 * ```
 */
export class UnregisterEventHandlerAction implements IRuntimeAction {
  readonly type = 'unregister-event-handler';
  
  constructor(
    /** The ID of the handler to unregister */
    public readonly handlerId: string
  ) {}

  do(runtime: IScriptRuntime): void {
    runtime.eventBus.unregisterById(this.handlerId);
  }
}
