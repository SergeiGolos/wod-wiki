import { TextFragment } from "@/core/fragments/TextFragment";
import { StatementNode } from "@/core/timer.types";

/**
 * Extracts the first text fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first text fragment or undefined if none exists
 */
export function getText(node: StatementNode): TextFragment | undefined {
  const fragments = node.fragments
    .filter(f => f.type === 'text')
    .map(f => f as TextFragment);

  return fragments?.[0];
}
