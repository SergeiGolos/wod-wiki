import { DistanceFragment } from "@/core/fragments/DistanceFragment";
import { StatementNode } from "@/core/timer.types";

/**
 * Extracts the first distance fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first distance fragment or undefined if none exists
 */
export function getDistance(node: StatementNode): DistanceFragment[] {
  const fragments = node.fragments
    .filter(f => f.type === 'distance')
    .map(f => f as DistanceFragment);

  return fragments;
}
