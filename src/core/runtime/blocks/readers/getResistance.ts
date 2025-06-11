import { ResistanceFragment } from "@/core/fragments/ResistanceFragment";
import { ICodeStatement } from "@/core/ICodeStatement";

/**
 * Extracts the first resistance fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first resistance fragment or undefined if none exists
 */
export function getResistance(node: ICodeStatement): ResistanceFragment[] {
  const fragments = node.fragments
    .filter(f => f.type === 'resistance')
    .map(f => f as ResistanceFragment);

  return fragments;
}


