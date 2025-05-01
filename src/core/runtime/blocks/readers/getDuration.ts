import { TimerFragment } from "@/core/fragments/TimerFragment";
import { IRuntimeBlock, IDuration } from "@/core/timer.types";

export function getDuration(block: IRuntimeBlock): IDuration | undefined {
  const fragments = block.source?.fragments
    .filter(f => f.type === 'duration')
    .map(f => f as TimerFragment);

  return fragments?.[0] as IDuration | undefined;
}