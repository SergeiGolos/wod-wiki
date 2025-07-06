import { IScriptRuntime } from "./IScriptRuntime";

export interface IRuntimeAction {
    type: string;
    source: string;
    Do(runtime: IScriptRuntime) : void;
}
