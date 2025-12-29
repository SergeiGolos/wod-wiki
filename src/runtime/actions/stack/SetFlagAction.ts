import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';

/**
 * Action that sets a flag on a behavior after other actions have run.
 * Used for coordination between event handlers and lifecycle methods.
 */
export class SetFlagAction implements IRuntimeAction {
    readonly type = 'set-flag';

    constructor(
        private readonly setter: () => void
    ) {}

    do(_runtime: IScriptRuntime): void {
        this.setter();
    }
}
