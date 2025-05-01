import { DistanceFragment } from "@/core/fragments/DistanceFragment";
import { IRuntimeBlock } from "@/core/timer.types";

/**
 * Extracts the first distance fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first distance fragment or undefined if none exists
 */
export function getDistance(block: IRuntimeBlock): DistanceFragment | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'distance')
    .map(f => f as DistanceFragment);

  return fragments?.[0];
}
