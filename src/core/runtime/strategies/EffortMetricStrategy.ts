import { EffortFragment } from "../../fragments/EffortFragment";
import { RuntimeMetric } from "../../RuntimeMetric";
import { IFragmentCompilationStrategy, FragmentCompilationContext } from "./IFragmentCompilationStrategy";
import { FragmentType } from "../../CodeFragment";

export class EffortMetricStrategy implements IFragmentCompilationStrategy<EffortFragment> {
  readonly fragmentType = FragmentType.Effort;

  compile(
    fragment: EffortFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    // Replicate current EffortFragment.applyToMetric logic
    // Original: metric.effort = this.effort;
    
    if (!fragment.effort) {
      return [];
    }    const metric: RuntimeMetric = {
      sourceId: context.blockContext.blockKey.toString(),
      effort: fragment.effort,
      values: []
    };
    
    return [metric];
  }
}
