import { IRuntimeEvent } from "../EventHandler";

export class NextEvent implements IRuntimeEvent {
    public readonly name = 'NextEvent';
    public readonly timestamp = new Date();
}
