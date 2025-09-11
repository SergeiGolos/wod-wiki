import { IRuntimeEvent } from "../EventHandler";

export class NextEvent implements IRuntimeEvent {
    data?: any;    
    public readonly name = 'NextEvent';
    public readonly timestamp = new Date();
}
