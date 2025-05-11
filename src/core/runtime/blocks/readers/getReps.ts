import { EffortFragment } from "@/core/fragments/EffortFragment";
import { RepFragment } from "@/core/fragments/RepFragment";
import { StatementNode, RuntimeMetric, getFragments } from "@/core/timer.types";



export function getReps(node: StatementNode): RuntimeMetric | undefined {
  // Extract repetitions from RepFragment
  const { fragments } = node;
  const metric: RuntimeMetric = {
    effort: "",
    values: []
  };

  const effortFragments = getFragments<EffortFragment>(fragments, "effort");
  if (effortFragments.length > 0) {
    metric.effort = effortFragments[0].effort;
  }

  const repFragments = getFragments<RepFragment>(fragments, "rep");
  if (repFragments.length > 0 && repFragments[0].reps !== undefined) {
    repFragments.forEach(f => metric.values.push({
      type: "repetitions",
      value: f.reps ?? 0,
      unit: "reps"
    }));
  }

  return metric;
}
