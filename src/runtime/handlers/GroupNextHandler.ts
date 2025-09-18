import { IEventHandler, HandlerResponse, IRuntimeEvent, IRuntimeAction } from "../EventHandler";
import { PopBlockAction } from "../actions/PopBlockAction";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";

class AdvanceToNextChildAction implements IRuntimeAction {
    public readonly type = 'AdvanceToNextChild';
    public do(runtime: IScriptRuntime): void {
        const currentBlock = runtime.stack.current;
        if (currentBlock && typeof (currentBlock as any).advanceToNextChild === 'function') {
            console.log(`  ⏩ Advancing to next child in ${currentBlock.constructor.name}`);
            (currentBlock as any).advanceToNextChild();
        } else {
            console.warn(`  ⚠️ Current block doesn't implement advanceToNextChild: ${currentBlock?.constructor.name || 'undefined'}`);
        }
    }
}

export class GroupNextHandler implements IEventHandler {
    public readonly id = 'GroupNextHandler';
    public readonly name = 'GroupNextHandler';

    public handler(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse {
        if (event.name === 'NextEvent') {
            const block = runtime.stack.current;
            
            // Check if this is a block with child iteration capabilities
            if (!block || typeof (block as any).hasNextChild !== 'function') {
                console.log(`  ⏭️ GroupNextHandler skipping - current block doesn't implement child iteration: ${block?.constructor.name || 'undefined'}`);
                return {
                    handled: false,
                    shouldContinue: true,
                    actions: []
                };
            }
            
            console.log(`  🔄 GroupNextHandler handling NextEvent for ${block.constructor.name}`);
            
            const hasNext = (block as any).hasNextChild();
            const action = hasNext
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
