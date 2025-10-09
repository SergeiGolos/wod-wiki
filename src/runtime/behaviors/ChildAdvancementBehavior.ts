/**
 * ChildAdvancementBehavior
 * 
 * Tracks sequential position within child statement array and advances one child per next() call.
 * Implements the IRuntimeBehavior interface for composable runtime block functionality.
 */

import { CodeStatement } from '../../CodeStatement';
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { NextBlockLogger } from '../NextBlockLogger';

export class ChildAdvancementBehavior implements IRuntimeBehavior {
    private currentChildIndex: number = 0;
    private readonly children: ReadonlyArray<CodeStatement>;

    /**
     * Constructs a new ChildAdvancementBehavior.
     * @param children Array of child statements to advance through sequentially
     */
    constructor(children: CodeStatement[]) {
        // Store as readonly to prevent external modification
        this.children = Object.freeze([...children]);
    }

    /**
     * Called when block advances to next execution step.
     * Advances the current child index and returns empty when complete.
     */
    onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // Check if we're already complete
        if (this.currentChildIndex >= this.children.length) {
            NextBlockLogger.logChildAdvancement(
                this.currentChildIndex,
                this.children.length,
                true
            );
            return [];
        }

        // Advance to next child
        this.currentChildIndex++;

        // Log advancement
        NextBlockLogger.logChildAdvancement(
            this.currentChildIndex,
            this.children.length,
            this.currentChildIndex >= this.children.length
        );

        // Return empty array (compilation handled by LazyCompilationBehavior)
        return [];
    }

    /**
     * Gets the current child index position.
     * @returns Current index in children array (0-based)
     */
    getCurrentChildIndex(): number {
        return this.currentChildIndex;
    }

    /**
     * Gets the immutable children array.
     * @returns ReadonlyArray of child statements
     */
    getChildren(): ReadonlyArray<CodeStatement> {
        return this.children;
    }

    /**
     * Checks if all children have been processed.
     * @returns true if currentChildIndex >= children.length
     */
    isComplete(): boolean {
        return this.currentChildIndex >= this.children.length;
    }

    /**
     * Gets the current child statement (before advancement).
     * Used by LazyCompilationBehavior to get the child to compile.
     * @returns Current child statement or undefined if complete
     */
    getCurrentChild(): CodeStatement | undefined {
        if (this.currentChildIndex >= this.children.length) {
            return undefined;
        }
        return this.children[this.currentChildIndex];
    }
}
