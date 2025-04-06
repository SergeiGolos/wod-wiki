import { EventAction } from "../EventAction";
import { ButtonConfig, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";

export class SetButtonAction extends EventAction {
    constructor(
        event: RuntimeEvent,
        private buttons: ButtonConfig[]
    ) {
        super(event);
    }

    apply(runtime: ITimerRuntime): RuntimeEvent[] {        
        runtime.buttons = this.buttons;
        return [];
    }
}
