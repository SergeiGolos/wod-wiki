import { IEventHandler, HandlerResponse, IRuntimeEvent, IRuntimeAction } from "../EventHandler";
import { PopBlockAction } from "../actions/PopBlockAction";
import { PushBlockAction } from "../actions/PushBlockAction";
import { IScriptRuntime } from "../IScriptRuntime";

class AdvanceToNextChildAction implements IRuntimeAction {
    public readonly type = 'AdvanceToNextChild';
    public do(runtime: IScriptRuntime): void {
        const currentBlock = runtime.stack.current;
        if (currentBlock && typeof (currentBlock as any).advanceToNextChild === 'function') {
            console.log(`  ⏩ Advancing to next child in ${currentBlock.constructor.name}`);
            (currentBlock as any).advanceToNextChild();
            
            // After advancing, check if there's a child to push onto the stack
            if (typeof (currentBlock as any).getCurrentChildGroup === 'function') {
                const childGroup = (currentBlock as any).getCurrentChildGroup();
                if (childGroup && childGroup.length > 0) {
                    console.log(`  🔄 Found child group with ${childGroup.length} statements: [${childGroup.join(', ')}]`);
                    
                    // Get the actual statements from the script
                    const statements = childGroup.map((id: string) => {
                        // Parse the string ID back to number for statement lookup
                        const statementId = parseInt(id, 10);
                        return runtime.script.statements.find((stmt: any) => stmt.id === statementId);
                    }).filter(Boolean);
                    
                    if (statements.length > 0) {
                        console.log(`  📦 Pushing ${statements.length} child statements to stack`);
                        // Create a push action for the child statements and execute it immediately
                        new PushBlockAction(statements).do(runtime);
                    }
                }
            }
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
