import { IRuntimeEvent } from "../EventHandler";

export class ResetEvent implements IRuntimeEvent {
    public readonly name = 'reset';
    public readonly timestamp: Date;

    constructor(timestamp: Date = new Date()) {
        this.timestamp = timestamp;
    }
}
