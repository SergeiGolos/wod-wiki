import { ICodeFragment } from "@/core/models/CodeFragment";
import { EffortFragment } from "./fragments/EffortFragment";
import { TextFragment } from "./fragments/TextFragment";
import { MetricBehavior } from "@/types/MetricBehavior";
import { RuntimeMetric, MetricValue } from "../models/RuntimeMetric";
import { IScriptRuntime } from "../contracts/IScriptRuntime";
import type { ICodeStatement } from "@/core";

export interface IFragmentCompiler {
    readonly type: string;
    compile(fragment: ICodeFragment, runtime: IScriptRuntime): MetricValue[];
}

// Type guard for effort fragments
function isEffortFragment(fragment: ICodeFragment): fragment is EffortFragment {
    return fragment.type === 'effort';
}

// Type guard for text fragments
function isTextFragment(fragment: ICodeFragment): fragment is TextFragment {
    return fragment.type === 'text';
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

            if (isEffortFragment(fragment)) {
                if (effort.length > 0) {
                    effort += ', ';
                }
                effort += fragment.value;
            } else if (isTextFragment(fragment)) {
                if (effort.length > 0) {
                    effort += ', ';
                }
                effort += fragment.value.text;
            }
        }

        const label = effort.trim();
        return {
            exerciseId: label,  // Use exerciseId to match RuntimeMetric interface
            sourceId: statement.id?.toString(),
            behavior: this.resolveBehavior(statement.fragments),
            values: allValues,
            timeSpans: []
        };
    }

    private resolveBehavior(fragments: ICodeFragment[]): MetricBehavior {
        const explicitBehavior = fragments.find(fragment => fragment.behavior !== undefined)?.behavior;
        return explicitBehavior ?? MetricBehavior.Defined;
    }
}
