import { RuntimeEvent, ButtonConfig, TimerDisplay, WodResultBlock } from "../../../types/timer.types";
import { TimerRuntime } from "../timer.runtime";
import { EventAction } from "../EventAction";

export class SetButtonAction extends EventAction {
    constructor(
        event: RuntimeEvent,
        private buttons: ButtonConfig[]
    ) {
        super(event);
    }

    apply(
        runtime: TimerRuntime,
        setDisplay: (display: TimerDisplay) => void,
        setButtons: (buttons: ButtonConfig[]) => void,
        setResults: (results: WodResultBlock[]) => void
    ): void {
        setButtons(this.buttons);
    }
}
