import { EventHandler, HandlerResponse, IRuntimeEvent } from '../EventHandler';
import { StartAllSpansAction } from '../actions/StartAllSpansAction';
import { IScriptRuntime } from '../IScriptRuntime';

/**
 * Global handler for start events.
 * This is a system-wide event that affects ALL spans in memory.
 * When a start event occurs, ALL spans in memory should be started.
 */
export class StartHandler implements EventHandler {
    public readonly id = 'StartHandler';
    public readonly name = 'StartHandler';

    public handleEvent(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse {
        if (event.name === 'start') {
            console.log(`🟢 StartHandler - Processing global start event`);
            return {
                handled: true,
                shouldContinue: true, // Allow other handlers to process start events too
                actions: [new StartAllSpansAction(event.timestamp)]
            };
        }

        return { handled: false, shouldContinue: true, actions: [] };
    }
}