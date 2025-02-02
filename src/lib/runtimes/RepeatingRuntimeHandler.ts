import { IRuntimeAction } from "../IRuntimeAction";
import { IRuntimeHandler } from "../IRuntimeHandler";
import { TimerRuntime } from "../timer.runtime";

export class RepeatingRuntimeHandler implements IRuntimeHandler {
  increment: number;
  duration: number;
  rounds: number;

  constructor(increment: number, duration: number, rounds: number) {
    this.increment = increment;
    this.duration = duration;
    this.rounds = rounds;
  }
  type: string = "rounds";
  onTimerEvent(timestamp: Date, event: string, blocks?: TimerRuntime): IRuntimeAction[] {
    const block = blocks?.current[0];
    if (!block) {
      throw new Error("Method not implemented.");
    }

    switch (event) {
      case "lap":
        blocks.push("lap");
        return [];

      case "completed":
        blocks.push("stop");
        return [];

      default:
        return [];
    }
  }
}
