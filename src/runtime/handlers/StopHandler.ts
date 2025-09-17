import { EventHandler, HandlerResponse, IRuntimeEvent } from '../EventHandler';
import { StopAllSpansAction } from '../actions/StopAllSpansAction';
import { IScriptRuntime } from '../IScriptRuntime';

/**
 * Global handler for stop events.
 * This is a system-wide event that affects ALL spans in memory.
 * When a stop event occurs, ALL spans in memory should be stopped.
 */
export class StopHandler implements EventHandler {
    public readonly id = 'StopHandler';
    public readonly name = 'StopHandler';

    public handleEvent(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse {
        if (event.name === 'stop') {
            console.log(`🔴 StopHandler - Processing global stop event`);
            return {
                handled: true,
                shouldContinue: true, // Allow other handlers to process stop events too
                actions: [new StopAllSpansAction(event.timestamp)]
            };
        }

        return { handled: false, shouldContinue: true, actions: [] };
    }
}