import { ActionButton } from "@/core/timer.types";
import { OutputAction } from "../OutputAction";


export class SetButtonsAction extends OutputAction {
    constructor(buttons: ActionButton[], target: string) {
        super('SET_DISPLAY', { buttons, target });
    }
}
