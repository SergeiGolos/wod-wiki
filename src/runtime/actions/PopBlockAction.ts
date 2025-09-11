import { IRuntimeAction } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";

export class PopBlockAction implements IRuntimeAction {
    public readonly type = 'PopBlock';

    public do(runtime: IScriptRuntime): void {
        runtime.stack.pop();
    }
}
