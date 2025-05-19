import { ICodeStatement } from "@/core/CodeStatement";
import { EffortFragment } from "@/core/fragments/EffortFragment";
import { RepFragment } from "@/core/fragments/RepFragment";
import { getFragments } from "@/core/getFragments";
import { RuntimeMetric } from "@/core/RuntimeMetric";
import { getDistance } from "./getDistance";
import { getResistance } from "./getResistance";
import { getRepetitions } from "./getRepetitions";


export function getMetrics(node: ICodeStatement): RuntimeMetric {
  const effort: RuntimeMetric = {
    sourceId: node.id.toString(),
    effort: "",
    values: []
  };

  const effortFragments = getFragments<EffortFragment>(node.fragments, "effort").map(f => f.effort);
  if (effortFragments.length > 0) {
    effort.effort = effortFragments.join(" ");
  }

  getDistance(node).forEach(f => effort.values.push({
    type: "distance",
    value: parseFloat(f.value) || 0,
    unit: f.units
  }));

  getRepetitions(node).forEach((f: RepFragment) => effort.values.push({
    type: "repetitions",
    value: f.reps ?? 0,
    unit: "reps"
  }));

  getResistance(node).forEach(f => effort.values.push({
    type: "resistance",
    value: parseFloat(f.value) || 0,
    unit: f.units
  }));

  return effort;
}
