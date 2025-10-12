import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';

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
    // Remove handler from memory
    const handlerRefs = runtime.memory.search({
      type: 'handler',
      id: this.handlerId,
      ownerId: null,
      visibility: null
    });
    
    if (handlerRefs.length > 0) {
      runtime.memory.release(handlerRefs[0] as any);
      console.log(`🔧 Unregistered event handler: ${this.handlerId}`);
    } else {
      console.warn(`⚠️ Handler not found for unregistration: ${this.handlerId}`);
    }
  }
}
