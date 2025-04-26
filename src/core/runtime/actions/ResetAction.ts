import { ChromecastEvent } from "@/cast";
import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { GotoEvent } from "../timer.events";
import { Subject } from "rxjs";


export class ResetAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent
    ) {
    }
    name: string = 'reset';
    apply(_runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, _output: Subject<ChromecastEvent>): void {
        input.next(new GotoEvent(this.event.timestamp, -1));
    }
}
