import { TimerRuntime } from "@/core/runtime/timer.runtime";
import { EventAction } from "../EventAction";
import { ButtonConfig, RuntimeEvent, TimerDisplayBag, WodResultBlock } from "@/core/timer.types";

export class SetButtonAction extends EventAction {
    constructor(
        event: RuntimeEvent,
        private buttons: ButtonConfig[]
    ) {
        super(event);
    }

    apply(
        runtime: TimerRuntime,
        setDisplay: (display: TimerDisplayBag) => void,
        setButtons: (buttons: ButtonConfig[]) => void,
        setResults: (results: WodResultBlock[]) => void
    ): void {
        setButtons(this.buttons);
    }
}
