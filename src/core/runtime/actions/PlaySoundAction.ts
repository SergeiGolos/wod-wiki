import { IRuntimeAction, IRuntimeEvent, ITimerRuntime, OutputEvent } from "../../timer.types";
import { SoundService } from "../../services/SoundService";
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
  apply(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, _output: Subject<OutputEvent>): void {
    // Get the sound service and play the appropriate sound
    const soundService = SoundService.getInstance();
    
    if (soundService.isEnabled()) {
      soundService.play(this.soundType);
    }
  }
}
