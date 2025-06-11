import { ResistanceFragment } from "../../fragments/ResistanceFragment";
import { RuntimeMetric } from "../../types/RuntimeMetric";
import { IFragmentCompilationStrategy, FragmentCompilationContext } from "./IFragmentCompilationStrategy";
import { FragmentType } from "../../types/CodeFragment";

export class ResistanceMetricStrategy implements IFragmentCompilationStrategy<ResistanceFragment> {
  readonly fragmentType = FragmentType.Resistance;

  compile(
    fragment: ResistanceFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    // Replicate current ResistanceFragment.applyToMetric logic
    // Original: metric.values.push({ type: "resistance", value: Number(this.value), unit: this.units || "kg", round: rounds });
    
    if (isNaN(Number(fragment.value))) {
      return [];
    }    const metric: RuntimeMetric = {
      sourceId: context.blockContext.blockKey.toString(),
      effort: "",
      values: [{
        type: "resistance",
        value: Number(fragment.value),
        unit: fragment.units || "kg"
      }]
    };
    
    return [metric];
  }
}
