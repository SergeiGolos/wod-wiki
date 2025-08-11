import { EventHandler, HandlerResponse, IRuntimeEvent } from "../EventHandler";
import { PushBlockAction } from "../actions/PushBlockAction";

export class RootNextHandler implements EventHandler {
    public readonly id = 'RootNextHandler';
    public readonly name = 'Root Next Handler';
    private currentStatementIndex = 0; // Track which statement to compile next

    public handleEvent(event: IRuntimeEvent): HandlerResponse {
        console.log(`🌱 RootNextHandler.handleEvent() - Processing event: ${event.name}`);
        
        if (event.name === 'NextEvent') {
            console.log(`  🎯 RootNextHandler handling NextEvent - current statement index: ${this.currentStatementIndex}`);
            
            const runtime = event.runtime;
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
            
            // For grouped statements, include all child statements in the compilation
            const statementsToCompile = [nextStatement];
            
            // Check if this statement has children (indented statements following it)
            if (nextStatement.children && nextStatement.children.length > 0) {
                console.log(`  👥 Statement has ${nextStatement.children.length} children, including them in compilation`);
                
                // Find child statements by their IDs
                const childStatements = runtime.script.statements?.filter((stmt: any) => 
                    nextStatement.children.includes(stmt.id.toString())
                ) || [];
                
                statementsToCompile.push(...childStatements);
                console.log(`  📋 Total statements to compile: ${statementsToCompile.length}`);
            }
            
            // Create a PushBlockAction to compile these statements and add the resulting block to the stack
            const pushAction = new PushBlockAction(statementsToCompile);
            
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
