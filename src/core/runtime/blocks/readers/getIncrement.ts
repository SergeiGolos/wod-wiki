import { IncrementFragment } from "@/core/fragments/IncrementFragment";
import { ICodeStatement } from "@/core/CodeStatement";

/**
 * Extracts the first increment fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first increment fragment or undefined if none exists
 */
export function getIncrement(node: ICodeStatement): IncrementFragment[] {
  const fragments = node.fragments
    .filter(f => f.type === 'increment')
    .map(f => f as IncrementFragment);

  return fragments;
}
