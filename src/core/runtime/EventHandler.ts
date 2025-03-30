import { RuntimeEvent, ITimerRuntime, IRuntimeAction } from "../timer.types";



export abstract class EventHandler {
  abstract apply(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[];
}
