import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IEventHandler } from '../contracts/events/IEventHandler';

/**
 * Action for declaratively registering an event handler.
 * 
 * This action manages event handler registration by storing the handler
 * in runtime memory, making it available for event processing.
 * 
 * @example
 * ```typescript
 * // Register a handler for block completion
 * const handler = new BlockCompleteEventHandler(blockId);
 * return [new RegisterEventHandlerAction(handler, blockId)];
 * ```
 */
export class RegisterEventHandlerAction implements IRuntimeAction {
  readonly type = 'register-event-handler';
  
  constructor(
    /** The event handler to register */
    public readonly handler: IEventHandler,
    /** The block ID that owns this handler (for cleanup) */
    public readonly ownerId: string,
    /** Visibility of the handler (default: 'private') */
    public readonly visibility: 'public' | 'private' = 'private'
  ) {}

  do(runtime: IScriptRuntime): void {
    runtime.eventBus.register('*', this.handler, this.ownerId);
  }
}
