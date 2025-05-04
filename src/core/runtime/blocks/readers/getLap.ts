import { LapFragment } from "@/core/fragments/LapFragment";
import { StatementNode } from "@/core/timer.types";

/**
 * Extracts the first lap fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first lap fragment or undefined if none exists
 */
export function getLap(node: StatementNode): LapFragment | undefined {
  const fragments = node.fragments
    .filter(f => f.type === 'lap')
    .map(f => f as LapFragment);

  return fragments?.[0];
}

// Note: This function may need further adaptation based on how next() is implemented for StatementNode
export function getNext(node: StatementNode): StatementNode | undefined {  
  // This implementation assumes there's a way to get the next node from a StatementNode
  // May need to be adjusted based on the actual implementation
  return undefined;
}
