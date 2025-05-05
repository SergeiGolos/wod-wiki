import { EffortFragment } from "@/core/fragments/EffortFragment";
import { StatementNode } from "@/core/timer.types";

/**
 * Extracts the first effort fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first effort fragment or undefined if none exists
 */
export function getEffort(node: StatementNode): EffortFragment | undefined {
  const fragments = node.fragments
    .filter(f => f.type === 'effort')
    .map(f => f as EffortFragment);

  return fragments?.[0];
}
