import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';

export interface ChildRunnerConfig {
    /** Child statement ID groups to execute */
    childGroups: number[][];
}

// Placeholder for the actual push block action
// This will need to be imported from the actions module
interface PushBlockAction extends IRuntimeAction {
    statementIds: number[];
}

/**
 * Creates a push block action for the given statement IDs.
 * This is a simple factory - the actual action class should be imported.
 */
function createPushBlockAction(statementIds: number[]): PushBlockAction {
    return {
        execute: () => {
            // This is a placeholder. The actual implementation should use
            // the runtime's compilation system to create and push blocks.
            console.log('[ChildRunnerBehavior] Would push block for:', statementIds);
        },
        statementIds
    } as PushBlockAction;
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
            return [createPushBlockAction(firstGroup)];
        }
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        // Push next child if available
        if (this.childIndex < this.config.childGroups.length) {
            const nextGroup = this.config.childGroups[this.childIndex];
            this.childIndex++;
            return [createPushBlockAction(nextGroup)];
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
