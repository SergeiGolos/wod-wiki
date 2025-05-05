import { IncrementFragment } from "@/core/fragments/IncrementFragment";
import { TimerFragment } from "@/core/fragments/TimerFragment";
import { Duration, IDuration, StatementNode } from "@/core/timer.types";

/**
 * Extracts the first duration fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first duration fragment or undefined if none exists
 */
export function getDuration(node: StatementNode): IDuration | undefined {
  const sign = (node?.fragments?.find(f => f.type === 'increment') as IncrementFragment)?.increment ?? -1;
  
  const fragments = node?.fragments
    ?.filter(f => f.type === 'duration')
    ?.map(f => f as TimerFragment) ?? [];

  return fragments.length > 0 ? new Duration(fragments[0].original, sign == -1 ? "-" : "+") : undefined;
}