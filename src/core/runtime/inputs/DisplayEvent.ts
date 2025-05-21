import { ISpanDuration } from "@/core/ISpanDuration";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";


export class DisplayEvent implements IRuntimeEvent {
    constructor(public target:string, public span: ISpanDuration) {        
        this.timestamp = new Date();
    }    
    timestamp: Date;
    name = 'display';
}
