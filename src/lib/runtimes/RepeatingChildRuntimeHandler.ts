import { IRuntimeAction } from "../IRuntimeAction";
import { IRuntimeHandler } from "../IRuntimeHandler";
import { TimerRuntime } from "../timer.runtime";


export class RepeatingChildRuntimeHandler implements IRuntimeHandler {
  type: string = "statement";
  onTimerEvent(timestamp: Date, event: string, blocks?: TimerRuntime): IRuntimeAction[] {
    const block = blocks?.current[0];
    const parent = blocks?.[(block?.block.parents[0])!]![0];

    if (!block) {
      throw new Error("Method not implemented.");
    }

    switch (event) {
      case "lap":
        blocks.push("lap");
        return [];

      case "completed":
        blocks.push("stop");
        return parent?.runtimeHandler?.onTimerEvent(timestamp, event, blocks) || [];

      default:
        return [];
    }

    return [];
  }
}
