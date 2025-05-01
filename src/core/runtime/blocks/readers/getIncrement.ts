import { IncrementFragment } from "@/core/fragments/IncrementFragment";
import { IRuntimeBlock } from "@/core/timer.types";

/**
 * Extracts the first increment fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first increment fragment or undefined if none exists
 */
export function getIncrement(block: IRuntimeBlock): IncrementFragment | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'increment')
    .map(f => f as IncrementFragment);

  return fragments?.[0];
}
