import { ICodeStatement } from "@/core/CodeStatement";
import { TimerFragment } from "@/core/fragments/TimerFragment";

/**
 * Extracts the first duration fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first duration fragment or undefined if none exists
 */

export function getTimer(node: ICodeStatement): TimerFragment[] {
  const fragments = node?.fragments
    ?.filter(f => f.type === 'duration')
    ?.map(f => f as TimerFragment) ?? [];

  return fragments;
}
