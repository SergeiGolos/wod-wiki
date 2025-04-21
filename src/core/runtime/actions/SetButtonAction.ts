import { ChromecastEvent } from "@/cast/types/chromecast-events";

import { ActionButton, ITimerRuntime, IRuntimeEvent, IRuntimeAction } from "@/core/timer.types";

export class SetButtonAction implements IRuntimeAction {
    constructor(
        private event: IRuntimeEvent,
        private buttons: ActionButton[]
    ) {
    }

    apply(runtime: ITimerRuntime, _input: (event: IRuntimeEvent) => void, _output: (event: ChromecastEvent) => void): void {        
        // runtime.buttons = this.buttons;
        return;
    }
}
