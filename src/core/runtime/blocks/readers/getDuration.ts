import { IncrementFragment } from "@/core/fragments/IncrementFragment";
import { TimerFragment } from "@/core/fragments/TimerFragment";
import { Duration, IDuration, StatementNode } from "@/core/timer.types";

/**
 * Extracts the first duration fragment from a statement node
 * @param node The statement node to extract from
 * @returns The first duration fragment or undefined if none exists
 */

export function getTimer(node: StatementNode): TimerFragment[] {
  const fragments = node?.fragments
    ?.filter(f => f.type === 'duration')
    ?.map(f => f as TimerFragment) ?? [];

  return fragments;
}

export function getDuration(node: StatementNode): IDuration[] {
  const sign = (node?.fragments?.find(f => f.type === 'increment') as IncrementFragment)?.increment ?? -1;
  const fragments = getTimer(node);

  return fragments.map(f => new Duration(f.original, sign == -1 ? "-" : "+"));
}