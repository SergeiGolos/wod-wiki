import { RepFragment } from "@/core/fragments/RepFragment";
import { StatementNode } from "@/core/timer.types";

/**
 * Extracts the first rep fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first rep fragment or undefined if none exists
 */
export function getRep(node: StatementNode): RepFragment | undefined {
  const fragments = node.fragments
    .filter(f => f.type === 'rep')
    .map(f => f as RepFragment);

  return fragments?.[0];
}
