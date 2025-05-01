import { ResistanceFragment } from "@/core/fragments/ResistanceFragment";
import { IRuntimeBlock } from "@/core/timer.types";

/**
 * Extracts the first resistance fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first resistance fragment or undefined if none exists
 */
export function getResistance(block: IRuntimeBlock): ResistanceFragment | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'resistance')
    .map(f => f as ResistanceFragment);

  return fragments?.[0];
}
