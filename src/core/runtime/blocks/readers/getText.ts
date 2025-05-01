import { TextFragment } from "@/core/fragments/TextFragment";
import { IRuntimeBlock } from "@/core/timer.types";

/**
 * Extracts the first text fragment from a runtime block
 * @param block The runtime block to extract from
 * @returns The first text fragment or undefined if none exists
 */
export function getText(block: IRuntimeBlock): TextFragment | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'text')
    .map(f => f as TextFragment);

  return fragments?.[0];
}
