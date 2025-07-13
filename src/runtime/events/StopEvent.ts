import { IRuntimeEvent } from "../EventHandler";

export class StopEvent implements IRuntimeEvent {
    public readonly name = 'stop';
    public readonly timestamp: Date;

    constructor(timestamp: Date = new Date()) {
        this.timestamp = timestamp;
    }
}
