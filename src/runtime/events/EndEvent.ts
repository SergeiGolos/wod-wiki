import { IRuntimeEvent } from "../EventHandler";

export class EndEvent implements IRuntimeEvent {
    public readonly name = 'end';
    public readonly timestamp: Date;

    constructor(timestamp: Date = new Date()) {
        this.timestamp = timestamp;
    }
}
