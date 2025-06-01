import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";
import { OutputAction } from "../OutputAction";
import { IActionButton } from "@/core/IActionButton";

/**
 * Action to update button array for a named anchor.
 * Supports multiple button groups for different contexts.
 */
export class SetButtonAction extends OutputAction {
    constructor(private target: string, private buttons: IActionButton[]) {
        super('SET_BUTTON');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        return [{
            eventType: this.eventType,
            bag: { 
                target: this.target,
                data: this.buttons
            },
            timestamp: new Date()
        }];
    }
}
