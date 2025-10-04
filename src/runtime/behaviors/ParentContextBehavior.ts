/**
 * ParentContextBehavior
 * 
 * Maintains reference to parent runtime block for context-aware execution.
 * Implements the IRuntimeBehavior interface for composable runtime block functionality.
 */

import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';

export class ParentContextBehavior implements IRuntimeBehavior {
    private readonly parentContext: IRuntimeBlock | undefined;

    /**
     * Constructs a new ParentContextBehavior.
     * @param parentContext Reference to parent block (undefined for top-level blocks)
     */
    constructor(parentContext?: IRuntimeBlock) {
        this.parentContext = parentContext;
    }

    /**
     * Called when block is pushed onto the runtime stack.
     * Optional initialization hook (currently no-op).
     */
    onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // No initialization needed - just maintain reference
        return [];
    }

    /**
     * Gets the parent context reference.
     * @returns Parent block or undefined if no parent
     */
    getParentContext(): IRuntimeBlock | undefined {
        return this.parentContext;
    }

    /**
     * Checks if parent context exists.
     * @returns true if parent context is defined
     */
    hasParentContext(): boolean {
        return this.parentContext !== undefined;
    }
}
