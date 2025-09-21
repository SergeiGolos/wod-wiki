import { PopBlockAction } from '../actions/PopBlockAction';
import { IEventHandler, HandlerResponse, IRuntimeEvent } from '../EventHandler';
import { IScriptRuntime } from '../IScriptRuntime';

/**
 * Generic handler to mark completion and request pop.
 * Triggers on: CompleteEvent | EndEvent
 * Actions: Pop current block; optionally record event-history in private memory
 */
export class CompleteEventHandler implements IEventHandler {
    public readonly id = 'CompleteEventHandler';
    public readonly name = 'CompleteEventHandler';

    public handler(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse {
        if (event.name === 'CompleteEvent' || event.name === 'EndEvent') {
            // TODO: Optionally record event-history in private memory
            return {
                handled: true,
                shouldContinue: false,
                actions: [new PopBlockAction()]
            };
        }

        return { handled: false, shouldContinue: true, actions: [] };
    }
}