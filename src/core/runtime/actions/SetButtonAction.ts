import { EventAction } from "../EventAction";
import { ActionButton, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";

export class SetButtonAction extends EventAction {
    constructor(
        event: RuntimeEvent,
        private buttons: ActionButton[]
    ) {
        super(event);
    }

    apply(runtime: ITimerRuntime): RuntimeEvent[] {        
        runtime.buttons = this.buttons;
        return [];
    }
}
