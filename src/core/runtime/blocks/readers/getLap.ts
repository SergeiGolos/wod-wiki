import { LapFragment } from "@/core/fragments/LapFragment";
import { IRuntimeBlock } from "@/core/timer.types";

/**
 * Extracts the first lap fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first lap fragment or undefined if none exists
 */
export function getLap(block: IRuntimeBlock): LapFragment | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'lap')
    .map(f => f as LapFragment);

  return fragments?.[0];
}
