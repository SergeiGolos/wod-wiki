import { ChromecastEvent } from "@/cast/types/chromecast-events";

import { ActionButton, ITimerRuntime, IRuntimeEvent, IRuntimeAction } from "@/core/timer.types";
import { Subject } from "rxjs/internal/Subject";

export class SetButtonAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent,
        private buttons: ActionButton[]
    ) {
    }

    name: string = 'setButton';

    apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<ChromecastEvent>): void {        
        // runtime.buttons = this.buttons;
        return;
    }
}
