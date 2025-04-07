import { EventAction } from "../EventAction";
import { ITimerRuntime, RuntimeEvent } from "../../timer.types";
import { SoundService } from "../../services/SoundService";

/**
 * Action that plays a sound during workout execution
 */
export class PlaySoundAction extends EventAction {
  constructor(
    event: RuntimeEvent,
    private soundType: 'start' | 'complete' | 'countdown' | 'tick'
  ) {
    super(event);
  }

  apply(runtime: ITimerRuntime): RuntimeEvent[] {
    // Get the sound service and play the appropriate sound
    const soundService = SoundService.getInstance();
    
    if (soundService.isEnabled()) {
      soundService.play(this.soundType);
    }
    
    // Return empty array as this action doesn't generate new events
    return [];
  }
}
