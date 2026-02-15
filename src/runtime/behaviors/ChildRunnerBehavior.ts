import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { PushBlockAction } from '../actions/stack/PushBlockAction';
import { UpdateNextPreviewAction } from '../actions/stack/UpdateNextPreviewAction';

export interface ChildRunnerConfig {
    /** Child statement ID groups to execute */
    childGroups: number[][];
    /**
     * When true, skip pushing the first child on mount.
     * Used when WaitingToStartInjectorBehavior is present — the first
     * onNext() (after WaitingToStart pops) will push childGroups[0] instead.
     */
    skipOnMount?: boolean;
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
    private _dispatchedOnLastNext = false;

    constructor(private config: ChildRunnerConfig) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // When skipOnMount is true, defer first child push to onNext().
        // This allows WaitingToStartInjectorBehavior to push first.
        if (this.config.skipOnMount) {
            // Even when skipping mount, set the next preview to the first child
            if (this.config.childGroups.length > 0) {
                return [this.createNextPreview(ctx, this.config.childGroups[0])];
            }
            return [];
        }

        // Push first child on mount
        if (this.config.childGroups.length > 0) {
            const firstGroup = this.config.childGroups[0];
            this.childIndex = 1; // Next to push
            const actions: IRuntimeAction[] = [new CompileChildBlockAction(firstGroup)];
            // Set next preview to the upcoming child (index 1), or clear if none
            const upcomingGroup = this.config.childGroups[1];
            actions.push(this.createNextPreview(ctx, upcomingGroup));
            return actions;
        }
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        this._dispatchedOnLastNext = false;

        // Don't push more children if the parent block is already completed
        // (e.g., timer expired on an AMRAP, round cap reached externally).
        if (ctx.block.isComplete) {
            return [this.createNextPreview(ctx)];
        }
        
        // Push next child if available
        if (this.childIndex < this.config.childGroups.length) {
            const nextGroup = this.config.childGroups[this.childIndex];
            this.childIndex++;
            this._dispatchedOnLastNext = true;
            const actions: IRuntimeAction[] = [new CompileChildBlockAction(nextGroup)];
            // Set next preview to the upcoming child after this one, or clear if none
            const upcomingGroup = this.config.childGroups[this.childIndex];
            actions.push(this.createNextPreview(ctx, upcomingGroup));
            return actions;
        }

        // No more children — clear the next preview
        return [this.createNextPreview(ctx)];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    /**
     * Check if all children have been dispatched (CompileChildBlockAction returned).
     * Note: This becomes true as soon as the last child is dispatched,
     * even before it has actually completed execution.
     */
    get allChildrenExecuted(): boolean {
        return this.childIndex >= this.config.childGroups.length;
    }

    /**
     * Check if all children have completed execution.
     * This is true only when all children have been dispatched AND
     * the most recent onNext() call did NOT dispatch a new child
     * (meaning the last dispatched child has completed and returned
     * control to the parent via next()).
     * 
     * Use this instead of allChildrenExecuted when you need to know
     * if children are truly done (e.g., for round advancement).
     */
    get allChildrenCompleted(): boolean {
        return this.allChildrenExecuted && !this._dispatchedOnLastNext;
    }

    /**
     * Reset the child index (for looping).
     */
    resetChildIndex(): void {
        this.childIndex = 0;
        this._dispatchedOnLastNext = false;
    }

    /**
     * Called by RuntimeBlock.next() before the onNext loop begins.
     * Resets per-call state so that allChildrenCompleted returns
     * an accurate value regardless of behavior ordering.
     */
    prepareForNextCycle(): void {
        this._dispatchedOnLastNext = false;
    }

    /**
     * Create an UpdateNextPreviewAction for the block's `fragment:next` memory.
     * If `nextGroup` is provided, the action will populate fragments from those
     * statement IDs. If omitted or undefined, the preview is cleared.
     */
    private createNextPreview(ctx: IBehaviorContext, nextGroup?: number[]): UpdateNextPreviewAction {
        return new UpdateNextPreviewAction(
            ctx.block.key.toString(),
            nextGroup ?? []
        );
    }
}
