import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { IEventHandler } from '../../contracts/events/IEventHandler';
import { HandlerScope } from '../../contracts/events/IEventBus';

/**
 * Action for declaratively registering an event handler.
 * 
 * This action manages event handler registration by storing the handler
 * in runtime memory, making it available for event processing.
 * 
 * @example
 * ```typescript
 * // Register a handler for block completion (default 'active' scope)
 * const handler = new BlockCompleteEventHandler(blockId);
 * return [new RegisterEventHandlerAction(handler, blockId)];
 * 
 * // Register a handler that listens to child events ('bubble' scope)
 * return [new RegisterEventHandlerAction(handler, blockId, 'bubble')];
 * ```
 */
export class RegisterEventHandlerAction implements IRuntimeAction {
  readonly type = 'register-event-handler';
  
  constructor(
    /** The event handler to register */
    public readonly handler: IEventHandler,
    /** The block ID that owns this handler (for cleanup) */
    public readonly ownerId: string,
    /** Handler scope. Default: 'active' (only fires when owner is current block) */
    public readonly scope: HandlerScope = 'active'
  ) {}

  do(runtime: IScriptRuntime): void {
    runtime.eventBus.register('*', this.handler, this.ownerId, { scope: this.scope });
  }
}
