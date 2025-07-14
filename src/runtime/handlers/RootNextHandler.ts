import { EventHandler, HandlerResponse, IRuntimeEvent } from "../EventHandler";
import { PushBlockAction } from "../actions/PushBlockAction";

export class RootNextHandler implements EventHandler {
    public readonly id = 'RootNextHandler';
    public readonly name = 'Root Next Handler';
    private currentStatementIndex = 0; // Track which statement to compile next

    public handleEvent(event: IRuntimeEvent, context?: any): HandlerResponse {
        console.log(`🌱 RootNextHandler.handleEvent() - Processing event: ${event.name}`);
        
        if (event.name === 'NextEvent') {
            console.log(`  🎯 RootNextHandler handling NextEvent - current statement index: ${this.currentStatementIndex}`);
            
            // Get runtime from context
            const runtime = context?.runtime;
            if (!runtime) {
                console.log(`  ❌ No runtime context available`);
                return {
                    handled: true,
                    shouldContinue: false,
                    actions: []
                };
            }
            
            // Get root-level statements (no indentation)
            const rootStatements = runtime.script.statements?.filter((stmt: any) => stmt.meta?.columnStart === 0) || [];
            console.log(`  📚 Found ${rootStatements.length} root-level statements`);
            
            if (this.currentStatementIndex >= rootStatements.length) {
                console.log(`  🏁 All statements processed, workout complete`);
                return {
                    handled: true,
                    shouldContinue: false,
                    actions: []
                };
            }
            
            const nextStatement = rootStatements[this.currentStatementIndex];
            console.log(`  📝 Next statement to compile: ${nextStatement.id} (line ${nextStatement.meta?.line})`);
            
            // Create a PushBlockAction to compile this statement and add it to the stack
            const pushAction = new PushBlockAction([nextStatement]);
            
            this.currentStatementIndex++;
            console.log(`  ⬆️ Incremented statement index to: ${this.currentStatementIndex}`);
            
            return {
                handled: true,
                shouldContinue: false,
                actions: [pushAction]
            };
        }
        
        console.log(`  ❌ RootNextHandler - event not handled: ${event.name}`);
        return {
            handled: false,
            shouldContinue: true,
            actions: []
        };
    }
}
