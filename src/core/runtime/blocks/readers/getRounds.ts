import { RoundsFragment } from "@/core/fragments/RoundsFragment";
import { getFragments, StatementNode } from "@/core/timer.types";
import { RuntimeMetric } from "@/core/timer.types";
import { getDistance } from "./getDistance";
import { getResistance } from "./getResistance";
import { RepFragment } from "@/core/fragments/RepFragment";
import { EffortFragment } from "@/core/fragments/EffortFragment";

/**
 * Extracts the first rounds fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first rounds fragment or undefined if none exists
 */
export function getRounds(node: StatementNode): number[] {
  const fragments = node?.fragments
    ?.filter(f => f.type === 'rounds')
    ?.map(f => f as RoundsFragment) ?? [];

  return fragments.length > 0 ? fragments.map(f => f.count) : [1];
}

export function getMetrics(node: StatementNode): RuntimeMetric {
  const effort: RuntimeMetric = {
    sourceId: node.id.toString(),
    effort: "",
    values: []
  }

  const effortFragments = getFragments<EffortFragment>(node.fragments, "effort").map(f => f.effort);
  if (effortFragments.length > 0) {
    effort.effort = effortFragments.join(" ");
  }

  getDistance(node).forEach(f => effort.values.push({
    type: "distance",
    value: Number(f.value),
    unit: f.units
  }));

  getResistance(node).forEach(f => effort.values.push({
    type: "resistance",
    value: Number(f.value),
    unit: f.units
  }));
  
  getFragments<RepFragment>(node.fragments, "rep").forEach(f => effort.values.push({
    type: "repetitions",
    value: Number(f.reps),
    unit: "reps"
    }));

  return effort;
}
