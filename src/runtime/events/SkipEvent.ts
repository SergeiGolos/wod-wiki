import { IRuntimeEvent } from "../EventHandler";

export class SkipEvent implements IRuntimeEvent {
    public readonly name = 'skip';
    public readonly timestamp: Date;

    constructor(timestamp: Date = new Date()) {
        this.timestamp = timestamp;
    }
}
