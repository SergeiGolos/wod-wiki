import { IRuntimeBlockStrategy } from '../../contracts/IRuntimeBlockStrategy';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeStatement } from '../../../core/models/CodeStatement';
import { BlockBuilder } from '../BlockBuilder';
import { WaitingToStartBlock } from '../../blocks/WaitingToStartBlock';

/**
 * WaitingToStartStrategy composes a WaitingToStartBlock for pre-workout idle gates.
 *
 * This is a direct-build strategy (match() returns false) — it is not
 * discovered by the JIT pipeline. Instead, it is invoked explicitly by
 * SessionRootBlock or equivalent parent blocks when they need an idle gate
 * before workout execution begins.
 *
 * ## Responsibilities
 *
 * 1. Create a WaitingToStartBlock with proper behavior composition:
 *    - ReportOutputBehavior (emit segment/completion outputs)
 *    - LabelingBehavior (show idle display)
 *    - ButtonBehavior (show "Start Workout" button)
 *    - LeafExitBehavior (pop on user advance)
 * 2. No children — this is a leaf idle block
 *
 * ## Relationship to IdleBlockStrategy
 *
 * WaitingToStartStrategy creates a specialized WaitingToStartBlock with
 * fixed behavior composition. IdleBlockStrategy is more configurable and
 * supports various idle patterns. Use WaitingToStartStrategy specifically
 * for the pre-workout "Ready to Start" gate.
 *
 * @see WaitingToStartBlock
 * @see IdleBlockStrategy
 */
export class WaitingToStartStrategy implements IRuntimeBlockStrategy {
    priority = 100;

    /**
     * Idle blocks are not matched from statements — they are created directly.
     */
    match(_statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return false;
    }

    /**
     * Composable apply — not used for idle blocks.
     */
    apply(_builder: BlockBuilder, _statements: ICodeStatement[], _runtime: IScriptRuntime): void {
        // No-op for direct build
    }

    /**
     * Builds a WaitingToStartBlock.
     *
     * @param runtime - The script runtime context
     * @returns A fully composed WaitingToStartBlock
     *
     * @example
     * ```typescript
     * const strategy = new WaitingToStartStrategy();
     * const idle = strategy.build(runtime);
     * // Push onto stack before first workout block
     * runtime.do(new PushBlockAction(idle));
     * ```
     */
    build(runtime: IScriptRuntime): IRuntimeBlock {
        return new WaitingToStartBlock(runtime);
    }
}

/**
 * Default instance for convenience.
 */
export const waitingToStartStrategy = new WaitingToStartStrategy();
