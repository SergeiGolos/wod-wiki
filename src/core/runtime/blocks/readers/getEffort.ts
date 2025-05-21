import { EffortFragment } from "@/core/fragments/EffortFragment";
import { ICodeStatement } from "@/core/CodeStatement";

/**
 * Extracts the first effort fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first effort fragment or undefined if none exists
 */
export function getEffort(node: ICodeStatement): EffortFragment[] {
  const fragments = node.fragments
    .filter(f => f.type === 'effort')
    .map(f => f as EffortFragment);

  return fragments;
}
