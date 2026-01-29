import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

export interface ChildRunnerConfig {
    /** Child statement ID groups to execute */
    childGroups: number[][];
}

/**
 * PushChildBlockAction - Pushes a block for the given statement IDs.
 * 
 * Uses the JIT compiler to create and push blocks for child statements.
 * Uses O(1) statement lookup via runtime.getStatementById() when available.
 */
class PushChildBlockAction implements IRuntimeAction {
    readonly type = 'push-child-block';
    readonly target?: string;
    readonly payload?: unknown;

    constructor(private readonly statementIds: number[]) {
        this.payload = { statementIds };
    }

    do(runtime: IScriptRuntime): void {
        if (this.statementIds.length === 0) {
            // Edge case: empty ID list - not an error, just nothing to do
            return;
        }

        // Get the script and compiler from runtime
        const script = runtime.script;
        const compiler = runtime.jit;

        if (!script || !compiler) {
            // This is a configuration error - should not happen in production
            return;
        }

        // Get statements for these IDs - use O(1) lookup if available
        const statements = this.statementIds
            .map(id => runtime.getStatementById?.(id) ?? script.statements.find(s => s.id === id))
            .filter((s): s is NonNullable<typeof s> => s !== undefined);

        if (statements.length === 0) {
            // No statements found - this is a data integrity issue
            // The block will not be pushed, but execution can continue
            return;
        }

        // Compile and push the block
        const block = compiler.compile(statements, runtime);
        if (block) {
            runtime.pushBlock(block);
        }
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

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Push first child on mount
        if (this.config.childGroups.length > 0) {
            const firstGroup = this.config.childGroups[0];
            this.childIndex = 1; // Next to push
            return [new PushChildBlockAction(firstGroup)];
        }
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Push next child if available
        if (this.childIndex < this.config.childGroups.length) {
            const nextGroup = this.config.childGroups[this.childIndex];
            this.childIndex++;
            return [new PushChildBlockAction(nextGroup)];
        }

        // No more children - parent will handle completion
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
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
