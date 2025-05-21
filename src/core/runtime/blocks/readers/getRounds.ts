import { RoundsFragment } from "@/core/fragments/RoundsFragment";
import { ICodeStatement } from "@/core/CodeStatement";

/**
 * Extracts the first rounds fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first rounds fragment or undefined if none exists
 */

export function getRounds(node: ICodeStatement): RoundsFragment[] {
  const fragments = node?.fragments
    ?.filter(f => f.type === 'rounds')
    ?.map(f => f as RoundsFragment) ?? [];

  return fragments;
}
