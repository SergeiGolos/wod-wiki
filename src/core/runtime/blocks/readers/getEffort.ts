import { EffortFragment } from "@/core/fragments/EffortFragment";
import { IRuntimeBlock } from "@/core/timer.types";

/**
 * Extracts the first effort fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first effort fragment or undefined if none exists
 */
export function getEffort(block: IRuntimeBlock): EffortFragment | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'effort')
    .map(f => f as EffortFragment);

  return fragments?.[0];
}
