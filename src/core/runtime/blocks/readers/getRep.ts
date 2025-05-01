import { RepFragment } from "@/core/fragments/RepFragment";
import { IRuntimeBlock } from "@/core/timer.types";

/**
 * Extracts the first rep fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first rep fragment or undefined if none exists
 */
export function getRep(block: IRuntimeBlock): RepFragment | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'rep')
    .map(f => f as RepFragment);

  return fragments?.[0];
}
