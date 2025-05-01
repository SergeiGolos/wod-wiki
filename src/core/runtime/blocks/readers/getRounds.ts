import { RoundsFragment } from "@/core/fragments/RoundsFragment";
import { IRuntimeBlock } from "@/core/timer.types";

/**
 * Extracts the first rounds fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first rounds fragment or undefined if none exists
 */
export function getRounds(block: IRuntimeBlock): RoundsFragment | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'rounds')
    .map(f => f as RoundsFragment);

  return fragments?.[0];
}
