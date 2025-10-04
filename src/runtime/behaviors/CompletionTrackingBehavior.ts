/**
 * CompletionTrackingBehavior
 * 
 * Monitors child advancement progress and marks completion when all children processed.
 * Implements the IRuntimeBehavior interface for composable runtime block functionality.
 */

import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { ChildAdvancementBehavior } from './ChildAdvancementBehavior';

export class CompletionTrackingBehavior implements IRuntimeBehavior {
    private _isComplete: boolean = false;

    /**
     * Constructs a new CompletionTrackingBehavior.
     */
    constructor() {
        // Starts in incomplete state
    }

    /**
     * Called when block advances to next execution step.
     * Checks ChildAdvancementBehavior for completion status.
     */
    onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // Once complete, stay complete (irreversible transition)
        if (this._isComplete) {
            return [];
        }

        // Get ChildAdvancementBehavior to check completion
        const childBehavior = this.getChildBehavior(block);
        if (childBehavior) {
            this._isComplete = childBehavior.isComplete();
        }

        return [];
    }

    /**
     * Gets the current completion status.
     * @returns true if all children have been processed
     */
    getIsComplete(): boolean {
        return this._isComplete;
    }

    /**
     * Explicitly marks as complete.
     * Used for testing or special cases.
     */
    markComplete(): void {
        this._isComplete = true;
    }

    /**
     * Helper to get ChildAdvancementBehavior from the block.
     * @param block Runtime block to search for behavior
     * @returns ChildAdvancementBehavior or undefined
     */
    private getChildBehavior(block: any): ChildAdvancementBehavior | undefined {
        // Check if block has getBehavior method
        if (typeof block.getBehavior === 'function') {
            return block.getBehavior(ChildAdvancementBehavior);
        }
        
        // Fallback: try to find in behaviors array
        if (Array.isArray(block.behaviors)) {
            return block.behaviors.find(b => b instanceof ChildAdvancementBehavior) as ChildAdvancementBehavior;
        }

        return undefined;
    }
}
