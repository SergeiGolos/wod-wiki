import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { RestBlock } from '../../blocks/RestBlock';
import { PushBlockAction } from './PushBlockAction';

/**
 * Action that constructs a RestBlock with the given duration and pushes it
 * onto the runtime stack.
 *
 * Previously a private class inside ChildSelectionBehavior. Elevated to a
 * named action so any behavior or strategy that needs to inject a rest period
 * can do so without re-implementing the RestBlock construction pattern.
 *
 * @example
 * ```typescript
 * // Inside a behavior that needs a rest break between intervals
 * return [new PushRestBlockAction(remainingMs, 'Rest')];
 * ```
 */
export class PushRestBlockAction implements IRuntimeAction {
    readonly type = 'push-rest-block';

    constructor(
        public readonly durationMs: number,
        public readonly label: string = 'Rest'
    ) { }

    do(runtime: IScriptRuntime): IRuntimeAction[] {
        const restBlock = new RestBlock(runtime, {
            durationMs: this.durationMs,
            label: this.label,
        });
        return [new PushBlockAction(restBlock)];
    }
}
