import { RoundsFragment } from "../../fragments/RoundsFragment";
import { RuntimeMetric } from "../../types/RuntimeMetric";
import { IFragmentCompilationStrategy, FragmentCompilationContext } from "./IFragmentCompilationStrategy";
import { FragmentType } from "../../types/CodeFragment";

export class RoundsMetricStrategy implements IFragmentCompilationStrategy<RoundsFragment> {
  readonly fragmentType = FragmentType.Rounds;

  compile(
    fragment: RoundsFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    // Replicate current RoundsFragment.applyToMetric logic
    // Original: metric.values.push({ type: "rounds", value: this.count, unit: "rounds", round: rounds });
    
    if (typeof fragment.count !== "number") {
      return [];
    }    const metric: RuntimeMetric = {
      sourceId: context.blockContext.blockKey.toString(),
      effort: "",
      values: [{
        type: "rounds",
        value: fragment.count,
        unit: "rounds"
      }]
    };
    
    return [metric];
  }
}
