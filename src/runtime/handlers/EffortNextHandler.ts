import { EventHandler, HandlerResponse, IRuntimeEvent } from "../EventHandler";
import { NextEvent } from "../events/NextEvent";
import { PopBlockAction } from "../actions/PopBlockAction";
import { EffortBlock } from "../blocks/EffortBlock";

export class EffortNextHandler implements EventHandler {
    public readonly id = 'EffortNextHandler';
    public readonly name = 'EffortNextHandler';

    public handleEvent(event: IRuntimeEvent, context: { currentBlock: EffortBlock }): HandlerResponse {
        if (event.name === 'NextEvent') {
            return {
                handled: true,
                shouldContinue: false,
                actions: [new PopBlockAction()]
            };
        }

        return { handled: false, shouldContinue: true, actions: [] };
    }
}
