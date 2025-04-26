import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "../../timer.types";
import { SoundService } from "../../services/SoundService";
import { ChromecastEvent } from "@/cast/types/chromecast-events";
import { Subject } from "rxjs";

/**
 * Action that plays a sound during workout execution
 */
export class PlaySoundAction implements IRuntimeAction {
  constructor(
    private soundType: string
  ) {
  }
  name: string = 'play-sound';
  apply(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, _output: Subject<ChromecastEvent>): void {
    // Get the sound service and play the appropriate sound
    const soundService = SoundService.getInstance();
    
    if (soundService.isEnabled()) {
      soundService.play(this.soundType);
    }
  }
}
