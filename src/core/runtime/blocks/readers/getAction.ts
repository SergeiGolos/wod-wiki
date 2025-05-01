import { ActionFragment } from "@/core/fragments/ActionFragment";
import { IRuntimeBlock } from "@/core/timer.types";

/**
 * Extracts the first action fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first action fragment or undefined if none exists
 */
export function getAction(block: IRuntimeBlock): ActionFragment | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'action')
    .map(f => f as ActionFragment);

  return fragments?.[0];
}
