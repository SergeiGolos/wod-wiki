import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { WaitingToStartBlock } from '../blocks/WaitingToStartBlock';
import { PushBlockAction } from '../actions/stack/PushBlockAction';

/**
 * WaitingToStartInjectorBehavior pushes a WaitingToStartBlock on mount.
 *
 * This behavior is placed BEFORE ChildRunnerBehavior in the SessionRootBlock
 * behavior chain. On mount, it returns a PushBlockAction for a WaitingToStartBlock.
 * The WaitingToStartBlock acts as an idle gate — the user must click "Start"
 * to dismiss it, after which the parent's ChildRunnerBehavior takes over.
 *
 * ## Interaction with ChildRunnerBehavior
 *
 * When this behavior is present, ChildRunnerBehavior must be configured with
 * `skipOnMount: true` so it doesn't also push a child on mount.
 * When WaitingToStart pops (user clicks Start), PopBlockAction fires NextAction
 * on the parent, which triggers ChildRunnerBehavior.onNext() → pushes the
 * actual first child from childGroups[0].
 */
export class WaitingToStartInjectorBehavior implements IRuntimeBehavior {
    constructor(private readonly runtime: IScriptRuntime) {}

    onMount(_ctx: IBehaviorContext): IRuntimeAction[] {
        const waitingBlock = new WaitingToStartBlock(this.runtime);
        return [new PushBlockAction(waitingBlock)];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
