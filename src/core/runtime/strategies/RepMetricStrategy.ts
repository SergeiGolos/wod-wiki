import { RepFragment } from "../../fragments/RepFragment";
import { RuntimeMetric } from "../../RuntimeMetric";
import { IFragmentCompilationStrategy, FragmentCompilationContext } from "./IFragmentCompilationStrategy";
import { FragmentType } from "../../CodeFragment";

export class RepMetricStrategy implements IFragmentCompilationStrategy<RepFragment> {
  readonly fragmentType = FragmentType.Rep;

  compile(
    fragment: RepFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    // Replicate current RepFragment.applyToMetric logic
    // Original: metric.values.push({ type: "repetitions", value: this.reps, unit: "reps", round: rounds });
    
    if (typeof fragment.reps !== "number") {
      return [];
    }    const metric: RuntimeMetric = {
      sourceId: context.blockContext.blockKey.toString(),
      effort: "", // Will be set by EffortFragment compilation
      values: [{
        type: "repetitions",
        value: fragment.reps,
        unit: "reps"
      }]
    };
    
    return [metric];
  }
}
