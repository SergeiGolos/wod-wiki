import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { PushBlockAction } from './PushBlockAction';

/**
 * Action that compiles a set of statement IDs and pushes the resulting block.
 * Allows behaviors to request JIT compilation without holding a reference to the runtime/JIT compiler.
 */
export class CompileAndPushBlockAction implements IRuntimeAction {
    readonly type = 'compile-and-push-block';

    constructor(
        public readonly statementIds: number[],
        public readonly options: BlockLifecycleOptions = {}
    ) { }

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        if (!this.statementIds || this.statementIds.length === 0) {
            return [];
        }

        // Resolve child IDs to statements (lazy JIT resolution)
        const childStatements = runtime.script.getIds(this.statementIds);
        if (childStatements.length === 0) {
            return [];
        }

        try {
            // Compile the child group using JIT compiler
            const compiledBlock = runtime.jit.compile(childStatements, runtime);

            if (!compiledBlock) {
                return [];
            }

            // Delegate to PushBlockAction
            return [new PushBlockAction(compiledBlock, this.options)];
        } catch (error) {
            console.error(`CompileAndPushBlockAction: Compilation failed`, error);
            return [];
        }
    }
}
