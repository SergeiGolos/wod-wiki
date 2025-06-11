import { DistanceFragment } from "../../fragments/DistanceFragment";
import { RuntimeMetric } from "../../types/RuntimeMetric";
import { IFragmentCompilationStrategy, FragmentCompilationContext } from "./IFragmentCompilationStrategy";
import { FragmentType } from "../../types/CodeFragment";

export class DistanceMetricStrategy implements IFragmentCompilationStrategy<DistanceFragment> {
  readonly fragmentType = FragmentType.Distance;

  compile(
    fragment: DistanceFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    // Replicate current DistanceFragment.applyToMetric logic
    // Original: metric.values.push({ type: "distance", value: Number(this.value), unit: this.units || "m", round: rounds });
    
    if (isNaN(Number(fragment.value))) {
      return [];
    }    const metric: RuntimeMetric = {
      sourceId: context.blockContext.blockKey.toString(),
      effort: "",
      values: [{
        type: "distance",
        value: Number(fragment.value),
        unit: fragment.units || "m"
      }]
    };
    
    return [metric];
  }
}
