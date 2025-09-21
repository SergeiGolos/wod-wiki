import { ICodeFragment } from "../CodeFragment";
import { RuntimeMetric, MetricValue } from "./RuntimeMetric";
import { IScriptRuntime } from "./IScriptRuntime";
import { ICodeStatement } from "../CodeStatement";

export interface IFragmentCompiler {
    readonly type: string;
    compile(fragment: ICodeFragment, runtime: IScriptRuntime): MetricValue[];
}

// Note: Text fragments are handled by type guard checks without a local interface.

export class FragmentCompilationManager {
    private readonly compilers: Map<string, IFragmentCompiler> = new Map();

    constructor(compilers: IFragmentCompiler[]) {
        for (const compiler of compilers) {
            this.compilers.set(compiler.type, compiler);
        }
    }

    public compileStatementFragments(statement: ICodeStatement, context: IScriptRuntime): RuntimeMetric {
        const allValues: MetricValue[] = [];
        let effort = '';        
        for (const fragment of statement.fragments) {
            const compiler = this.compilers.get(fragment.type);
            if (compiler) {
                allValues.push(...compiler.compile(fragment, context));
            }

            if (fragment.type === 'effort') {
                if (effort.length > 0) {
                    effort += ', ';
                }
                effort += (fragment as any).value;
            } else if (fragment.type === 'text') {
                if (effort.length > 0) {
                    effort += ', ';
                }
                effort += (fragment as any).value.text;
            }
        }

        const label = effort.trim();
        return {
            sourceId: statement.id?.toString(), // Convert numeric position ID to string for sourceId
            ...(label ? { effort: label } : {}),
            values: allValues
        } as RuntimeMetric;
    }
}
