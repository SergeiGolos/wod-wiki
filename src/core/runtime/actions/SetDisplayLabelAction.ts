import { RuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventAction } from "../EventAction";


export class SetDisplayLabelAction extends EventAction {
    private label: string;

    constructor(event: RuntimeEvent, label: string) {
        super(event);
        this.label = label;
    }

    apply(runtime: ITimerRuntime): RuntimeEvent[] {
        runtime.display.label = this.label;
        return [];
    }
}
