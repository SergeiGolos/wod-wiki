import { ActionFragment } from "@/core/fragments/ActionFragment";
import { PrecompiledNode } from "@/core/timer.types";

/**
 * Extracts the first action fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first action fragment or undefined if none exists
 */
export function getAction(block: PrecompiledNode): ActionFragment[] {
  const fragments = block?.fragments
    .filter(f => f.type === 'action')
    .map(f => f as ActionFragment);

  return fragments ?? [];
}
