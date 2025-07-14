import { IRuntimeAction } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";

export class PushBlockAction implements IRuntimeAction {
    public readonly type = 'PushBlock';

    constructor(private statements: any[]) {
        console.log(`⚡ PushBlockAction created for ${statements.length} statements`);
    }

    public do(runtime: IScriptRuntime): void {
        console.log(`⚡ PushBlockAction.do() - Compiling and pushing ${this.statements.length} statements`);
        
        try {
            // Use the JIT compiler to compile the statements into a runtime block
            const compiledBlock = runtime.jit.compile(this.statements, runtime);
            
            if (compiledBlock) {
                console.log(`  ✅ Successfully compiled block: ${compiledBlock.key.toString()}`);
                runtime.stack.push(compiledBlock);
                console.log(`  📚 Block pushed to stack, new depth: ${runtime.stack.blocks.length}`);
            } else {
                console.log(`  ❌ Failed to compile statements - JitCompiler returned undefined`);
            }
        } catch (error) {
            console.log(`  ❌ Error during compilation: ${error}`);
        }
    }
}
