import { EventHandler, HandlerResponse, IRuntimeEvent } from '../EventHandler';
import { PopBlockAction } from '../actions/PopBlockAction';
import { IScriptRuntime } from '../IScriptRuntime';

/**
 * Generic handler to mark completion and request pop.
 * Triggers on: CompleteEvent | EndEvent
 * Actions: Pop current block; optionally record event-history in private memory
 */
export class CompleteEventHandler implements EventHandler {
    public readonly id = 'CompleteEventHandler';
    public readonly name = 'CompleteEventHandler';

    public handleEvent(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse {
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