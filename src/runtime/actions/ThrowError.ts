import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { ErrorAction } from './ErrorAction';

/**
 * Action that registers a runtime error and transitions the workout to an error state.
 */
export class ThrowErrorAction implements IRuntimeAction {
    readonly type = 'throw-error';

    constructor(
        private readonly error: Error,
        private readonly source: string
    ) { }

    do(runtime: IScriptRuntime): void {
        // Register the error in the runtime
        new ErrorAction(this.error, this.source).do(runtime);

        // Emit error state via event bus so UI can react
        runtime.eventBus.dispatch({
            name: 'workout:error',
            timestamp: runtime.clock.now,
            data: { error: this.error, source: this.source }
        }, runtime);
    }
}

/**
 * Factory function to create a ThrowErrorAction.
 */
export function ThrowError(error: Error, source: string): IRuntimeAction {
    return new ThrowErrorAction(error, source);
}
