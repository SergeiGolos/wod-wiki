import { IRuntimeEvent } from "../EventHandler";

export class RunEvent implements IRuntimeEvent {
    public readonly name = 'run';
    public readonly timestamp: Date;

    constructor(timestamp: Date = new Date()) {
        this.timestamp = timestamp;
    }
}
