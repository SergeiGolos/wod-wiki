import { EventHandler, HandlerResponse, IRuntimeEvent, IRuntimeAction } from "../EventHandler";
import { NextEvent } from "../events/NextEvent";
import { PopBlockAction } from "../actions/PopBlockAction";
import { TimedGroupBlock } from "../blocks/TimedGroupBlock";
import { IScriptRuntime } from "../IScriptRuntime";

class AdvanceToNextChildAction implements IRuntimeAction {
    public readonly type = 'AdvanceToNextChild';
    public do(runtime: IScriptRuntime): void {
        const currentBlock = runtime.stack.current as TimedGroupBlock;
        if (currentBlock && typeof currentBlock.advanceToNextChild === 'function') {
            currentBlock.advanceToNextChild();
        }
    }
}

export class GroupNextHandler implements EventHandler {
    public readonly id = 'GroupNextHandler';
    public readonly name = 'GroupNextHandler';

    public handleEvent(event: IRuntimeEvent): HandlerResponse {
        if (event.name === 'NextEvent') {
            const block = event.runtime.stack.current as TimedGroupBlock;
            const action = block.hasNextChild()
                ? new AdvanceToNextChildAction()
                : new PopBlockAction();

            return {
                handled: true,
                shouldContinue: false,
                actions: [action]
            };
        }

        return { handled: false, shouldContinue: true, actions: [] };
    }
}
