import { IEventHandler, HandlerResponse, IRuntimeEvent } from "../EventHandler";
import { NextEvent } from "../events/NextEvent";
import { PopBlockAction } from "../actions/PopBlockAction";
import { EffortBlock } from "../blocks/EffortBlock";

export class EffortNextHandler implements IEventHandler {
    public readonly id = 'EffortNextHandler';
    public readonly name = 'EffortNextHandler';

    public handler(event: IRuntimeEvent): HandlerResponse {
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
