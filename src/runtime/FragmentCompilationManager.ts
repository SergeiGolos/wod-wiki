import { ICodeFragment } from "../CodeFragment";
import { RuntimeMetric, MetricValue } from "./RuntimeMetric";
import { IScriptRuntime } from "./IScriptRuntime";
import { ICodeStatement } from "../CodeStatement";

export interface IFragmentCompiler {
    readonly type: string;
    compile(fragment: ICodeFragment, runtime: IScriptRuntime): MetricValue[];
}

// This is a guess, we probably have a specific fragment for this.
interface ITextFragment extends ICodeFragment {
    type: 'text';
    value: string;
}

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

        return {
            sourceId: statement.id?.toString(), // Assuming ICodeStatement has a key
            effort: effort.trim(),
            values: allValues
        };
    }
}
