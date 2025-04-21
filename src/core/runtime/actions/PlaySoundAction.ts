import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "../../timer.types";
import { SoundService } from "../../services/SoundService";
import { ChromecastEvent } from "@/cast/types/chromecast-events";

/**
 * Action that plays a sound during workout execution
 */
export class PlaySoundAction implements IRuntimeAction {
  constructor(
    private event: IRuntimeEvent,
    private soundType: string
  ) {
  }

  apply(runtime: ITimerRuntime, _input: (event: IRuntimeEvent) => void, _output: (event: ChromecastEvent) => void): IRuntimeEvent[] {
    // Get the sound service and play the appropriate sound
    const soundService = SoundService.getInstance();
    
    if (soundService.isEnabled()) {
      soundService.play(this.soundType);
    }
    
    // Return empty array as this action doesn't generate new events
    return [];
  }
}
