import { IRuntimeEvent, StatementNode, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { PlaySoundAction } from "../actions/PlaySoundAction";
import { EventHandler } from "../EventHandler";
import { SoundEvent } from "../timer.events";


export class SoundHandler extends EventHandler {
  protected eventType: string = 'sound';

  protected handleEvent(event: IRuntimeEvent, _stack: StatementNode[], _runtime: ITimerRuntime): IRuntimeAction[] {
    const soundEvent = event as SoundEvent;
    return [new PlaySoundAction(soundEvent, soundEvent.sound)];
  }
}
