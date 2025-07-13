import { IRuntimeEvent } from "../EventHandler";

export class TickEvent implements IRuntimeEvent {
    public readonly name = 'tick';
    public readonly timestamp: Date;

    constructor() {
        this.timestamp = new Date();
    }
}
