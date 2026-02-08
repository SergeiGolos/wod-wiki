import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { PushBlockAction } from '../actions/stack/PushBlockAction';

export interface ChildRunnerConfig {
    /** Child statement ID groups to execute */
    childGroups: number[][];
}

/**
 * CompileChildBlockAction - Compiles and returns a PushBlockAction for child statements.
 * 
 * Uses the JIT compiler to create blocks for child statements, then delegates
 * to PushBlockAction for the actual stack push. This keeps stack operations
 * centralized in IRuntimeAction implementations.
 */
class CompileChildBlockAction implements IRuntimeAction {
    readonly type = 'compile-child-block';
    readonly target?: string;
    readonly payload?: unknown;

    constructor(private readonly statementIds: number[]) {
        this.payload = { statementIds };
    }

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        if (this.statementIds.length === 0) {
            return [];
        }

        const script = runtime.script;
        const compiler = runtime.jit;

        if (!script || !compiler) {
            return [];
        }

        // Get statements for these IDs - use O(1) lookup if available
        const statements = this.statementIds
            .map(id => script.getId(id))
            .filter((s): s is NonNullable<typeof s> => s !== undefined);

        if (statements.length === 0) {
            return [];
        }

        // Compile and return PushBlockAction
        const block = compiler.compile(statements as any, runtime);
        if (block) {
            return [new PushBlockAction(block)];
        }
        return [];
    }
}

/**
 * ChildRunnerBehavior manages execution of child blocks.
 * 
 * ## Aspect: Children
 * 
 * Pushes the next child block when the current one completes.
 * Tracks which child to push next using internal index.
 */
export class ChildRunnerBehavior implements IRuntimeBehavior {
    private childIndex = 0;

    constructor(private config: ChildRunnerConfig) { }

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Push first child on mount
        if (this.config.childGroups.length > 0) {
            const firstGroup = this.config.childGroups[0];
            this.childIndex = 1; // Next to push
            return [new CompileChildBlockAction(firstGroup)];
        }
        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        // Push next child if available
        if (this.childIndex < this.config.childGroups.length) {
            const nextGroup = this.config.childGroups[this.childIndex];
            this.childIndex++;
            return [new CompileChildBlockAction(nextGroup)];
        }

        // No more children - parent will handle completion
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    /**
     * Check if all children have been executed.
     */
    get allChildrenExecuted(): boolean {
        return this.childIndex >= this.config.childGroups.length;
    }

    /**
     * Reset the child index (for looping).
     */
    resetChildIndex(): void {
        this.childIndex = 0;
    }
}
