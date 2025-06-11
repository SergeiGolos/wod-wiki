import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { SoundService } from "../../../../services/SoundService";
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
