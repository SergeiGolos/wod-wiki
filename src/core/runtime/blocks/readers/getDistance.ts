import { DistanceFragment } from "@/core/fragments/DistanceFragment";
import { EffortFragment } from "@/core/fragments/EffortFragment";
import { RepFragment } from "@/core/fragments/RepFragment";
import { ResistanceFragment } from "@/core/fragments/ResistanceFragment";
import { getFragments, RuntimeMetric, StatementNode } from "@/core/timer.types";

/**
 * Extracts the first distance fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first distance fragment or undefined if none exists
 */
export function getDistance(node: StatementNode): DistanceFragment | undefined {
  const fragments = node.fragments
    .filter(f => f.type === 'distance')
    .map(f => f as DistanceFragment);

  return fragments?.[0];
}


export function getMetrics(node: StatementNode): RuntimeMetric {
  // Initialize the RuntimeMetric object with default values
  const metric: RuntimeMetric = {
    effort: "",
    values: []
  };

  // Get the fragments array from the node
  const { fragments } = node;
  
  // Extract effort from EffortFragment
  const effortFragments = getFragments<EffortFragment>(fragments, "effort");
  if (effortFragments.length > 0) {
    metric.effort = effortFragments[0].effort;
  }
  
  // Extract repetitions from RepFragment
  const repFragments = getFragments<RepFragment>(fragments, "rep");
  if (repFragments.length > 0 && repFragments[0].reps !== undefined) {
    metric.values.push({
      type: "repetitions",
      value: repFragments[0].reps,
      unit: "reps"
    });
  }
  
  // Extract resistance from ResistanceFragment
  const resistanceFragments = getFragments<ResistanceFragment>(fragments, "resistance");
  if (resistanceFragments.length > 0) {
    metric.values.push({
      type: "resistance",
      value: parseFloat(resistanceFragments[0].value),
      unit: resistanceFragments[0].units
    });
  }
  
  // Extract distance from DistanceFragment
  const distanceFragments = getFragments<DistanceFragment>(fragments, "distance");
  if (distanceFragments.length > 0) {
    metric.values.push({
      type: "distance",
      value: parseFloat(distanceFragments[0].value),
      unit: distanceFragments[0].units
    });
  }
  
  return metric;
}