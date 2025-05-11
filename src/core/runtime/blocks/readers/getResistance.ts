import { ResistanceFragment } from "@/core/fragments/ResistanceFragment";
import { StatementNode } from "@/core/timer.types";

/**
 * Extracts the first resistance fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first resistance fragment or undefined if none exists
 */
export function getResistance(node: StatementNode): ResistanceFragment[] {
  const fragments = node.fragments
    .filter(f => f.type === 'resistance')
    .map(f => f as ResistanceFragment);

  return fragments;
}
