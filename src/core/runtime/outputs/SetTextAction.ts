import { OutputAction } from "../OutputAction";


export class SetTextAction extends OutputAction {
    constructor(text: string, target: string) {
        super('SET_TEXT', { text, target });
    }
}
