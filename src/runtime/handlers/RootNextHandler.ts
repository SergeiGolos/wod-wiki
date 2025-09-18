import { IEventHandler, HandlerResponse, IRuntimeEvent } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";
import { PushBlockAction } from "../actions/PushBlockAction";
import { RootBlock } from "../blocks/RootBlock";

export class RootNextHandler implements IEventHandler {
    public readonly id = 'RootNextHandler';
    public readonly name = 'Root Next Handler';    

    public handler(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse {        
        if (event.name === 'NextEvent') {
            // Check if the current block is actually a RootBlock before proceeding
            if (!(runtime.stack.current instanceof RootBlock)) {
                console.log(`  ⏭️ RootNextHandler skipping - current block is not a RootBlock: ${runtime.stack.current?.constructor.name}`);
                return {
                    handled: false,
                    shouldContinue: true,
                    actions: []
                };
            }
            
            const root = runtime.stack.current as RootBlock;                        
            let currentIndex = root.getStatementIndex();
            
            // Handle initial -1 case or ensure valid index
            if (currentIndex < 0) {
                currentIndex = 0;
                root.setStatementIndex(0);
            }
            console.log(`  🎯 RootNextHandler handling NextEvent - current statement index: ${currentIndex}`);
            if (!runtime) {
                console.log(`  ❌ No runtime context available`);
                return {
                    handled: true,
                    shouldContinue: false,
                    actions: []
                };
            }
            
            // Get root-level statements (no indentation)
            const rootStatements = runtime.script.statements?.filter((stmt: any) => stmt.meta?.columnStart === 1) || [];
            console.log(`  📚 Found ${rootStatements.length} root-level statements`);

            if (currentIndex >= rootStatements.length) {
                console.log(`  🏁 All statements processed, workout complete`);
                return {
                    handled: true,
                    shouldContinue: false,
                    actions: []
                };
            }
            
            const nextStatement = rootStatements[currentIndex];
            
            if (!nextStatement) {
                console.log(`  ❌ No statement found at index ${currentIndex}`);
                return {
                    handled: true,
                    shouldContinue: false,
                    actions: []
                };
            }
            
            console.log(`  📝 Next statement to compile: ${nextStatement.id} (line ${nextStatement.meta?.line})`);
            
            // For grouped statements, include all child statements in the compilation
            const statementsToCompile = [nextStatement];
            // Create a PushBlockAction to compile these statements and add the resulting block to the stack
            const pushAction = new PushBlockAction(statementsToCompile);
            
            // Increment the statement index in memory
            root.incrementStatementIndex();
            console.log(`  ⬆️ Incremented statement index to: ${root.getStatementIndex()}`);
            
            return {
                handled: true,
                shouldContinue: false,
                actions: [pushAction]
            };
        }
                
        return {
            handled: false,
            shouldContinue: true,
            actions: []
        };
    }
}
