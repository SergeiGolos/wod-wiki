import { RuntimeEvent, TimerRuntime } from "../timer.runtime";
import { EventAction } from "../EventAction";
import { ButtonConfig, TimerDisplay, WodResultBlock } from "../../timer.types";

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
