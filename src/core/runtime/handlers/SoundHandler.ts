import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { PlaySoundAction } from "../actions/PlaySoundAction";
import { EventHandler } from "../EventHandler";
import { SoundEvent } from "../events/SoundEvent";

export class SoundHandler extends EventHandler {
  protected eventType: string = 'sound';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {
    const soundEvent = event as SoundEvent;
    return [new PlaySoundAction(soundEvent.sound)];
  }
}
