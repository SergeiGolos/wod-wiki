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
    if (!block || block.blockId == "-1") {
      return;
    }
    const spans = block.getSpans();
    const currentLap =
      spans.length > 0 ? spans[spans.length - 1] : undefined;

    if (!currentLap || currentLap.stop) {
      spans.push({
        blockKey: block.blockKey,
        start: this.event,
        stop: undefined,
        metrics: [],
      } as unknown as ResultSpan);
    }    
  }
}
