import { RoundsFragment } from "@/core/fragments/RoundsFragment";
import { StatementNode } from "@/core/timer.types";

/**
 * Extracts the first rounds fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first rounds fragment or undefined if none exists
 */
export function getRounds(node: StatementNode): number {
  const fragments = node?.fragments
    ?.filter(f => f.type === 'rounds')
    ?.map(f => f as RoundsFragment) ?? [];

  return fragments.length > 0 ? fragments[0].count : 1;
}
