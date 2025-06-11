import { LapFragment } from "@/core/fragments/LapFragment";
import { ICodeStatement } from "@/core/ICodeStatement";

/**
 * Extracts the first lap fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first lap fragment or undefined if none exists
 */
export function getLap(node: ICodeStatement): LapFragment[] {
  const fragments = node?.fragments
    ?.filter(f => f.type === 'lap')
    ?.map(f => f as LapFragment) ?? [];

  return fragments;
}