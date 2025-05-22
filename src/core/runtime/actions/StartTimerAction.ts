import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { Subject } from "rxjs";
import { ITimeSpan } from "@/core/ITimeSpan";

export class StartTimerAction implements IRuntimeAction {
  constructor(private event: IRuntimeEvent) {}
  name: string = "start";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ) {
    const block = runtime.trace.current();
    // The event property is kept in the constructor for consistency, 
    // but not used here as span logic is moved.
    console.log(`StartTimerAction executed for block: ${block?.blockKey}, event: ${this.event.name} at ${this.event.timestamp}`);
    // Span manipulation logic previously here is now handled by RuntimeBlock.onStart
  }
}
