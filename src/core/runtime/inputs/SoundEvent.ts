import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { PlaySoundAction } from "../actions/PlaySoundAction";
import { EventHandler } from "../EventHandler";

export class SoundEvent implements IRuntimeEvent {
    constructor(public sound: string, timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'sound';
}

export class SoundHandler extends EventHandler {
  protected eventType: string = 'sound';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {
    const soundEvent = event as SoundEvent;
    return [new PlaySoundAction(soundEvent.sound)];
  }
}

