import { ICodeStatement } from "@/CodeStatement";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";

export interface IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean;
    compile(statements: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock;
}