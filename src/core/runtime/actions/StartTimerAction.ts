import {
  IRuntimeAction,
  IRuntimeEvent,
  ITimerRuntime,
  OutputEvent,
  ResultSpan,
} from "@/core/timer.types";
import { Subject } from "rxjs";

export class StartTimerAction implements IRuntimeAction {
  constructor(private event: IRuntimeEvent) {}
  name: string = "start";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ) {
    const block = runtime.trace.current();
    if (!block) {
      throw new Error("StartTimerAction - Runtime is not defined");
    }

    const currentLap =
      block.laps.length > 0 ? block.laps[block.laps.length - 1] : undefined;

    if (!currentLap || currentLap.stop) {
      block.laps.push({
        blockKey: block.blockKey,
        start: this.event,
        stop: undefined,
        metrics: [],
      } as unknown as ResultSpan);
    }    
  }
}
