import { ICodeStatement } from "@/CodeStatement";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { CompilationContext } from "./CompilationContext";

export interface IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean;
    compile(statements: ICodeStatement[], runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock;
}