import { IRuntimeEvent } from "../EventHandler";

export class StartEvent implements IRuntimeEvent {
    public readonly name = 'start';
    public readonly timestamp: Date;

    constructor(timestamp: Date = new Date()) {
        this.timestamp = timestamp;
    }
}
