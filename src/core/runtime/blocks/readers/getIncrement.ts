import { IncrementFragment } from "@/core/fragments/IncrementFragment";
import { StatementNode } from "@/core/timer.types";

/**
 * Extracts the first increment fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first increment fragment or undefined if none exists
 */
export function getIncrement(node: StatementNode): IncrementFragment[] {
  const fragments = node.fragments
    .filter(f => f.type === 'increment')
    .map(f => f as IncrementFragment);

  return fragments;
}
