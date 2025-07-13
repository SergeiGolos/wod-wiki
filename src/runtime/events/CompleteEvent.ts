import { IRuntimeEvent } from "../EventHandler";

export class CompleteEvent implements IRuntimeEvent {
    public readonly name = 'complete';
    public readonly timestamp: Date;

    constructor(timestamp: Date = new Date()) {
        this.timestamp = timestamp;
    }
}
