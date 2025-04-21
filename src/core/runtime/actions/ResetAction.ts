import { ChromecastEvent } from "@/cast";
import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { GotoEvent } from "../timer.events";


export class ResetAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent
    ) {
    }

    apply(_runtime: ITimerRuntime, input: (event: IRuntimeEvent) => void, _output: (event: ChromecastEvent) => void): void {
        input(new GotoEvent(this.event.timestamp, -1));
    }
}
