
import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "../timer.types";
import { ButtonConfig, TimerDisplay, WodResultBlock } from "../timer.types";
import { PlayIcon, StopIcon, ArrowPathIcon } from "@heroicons/react/24/solid";

export const startButton: ButtonConfig = {
    label: "Run",
    icon: PlayIcon,
    onClick: () => {
      return [{name: "start", timestamp: new Date()}]
    },
  };

  export const stopButton: ButtonConfig = {
    label: "Stop",
    icon: StopIcon,
    onClick: () => {
      return [{name: "stop", timestamp: new Date()}]
    },
  };

  export const resetButton: ButtonConfig = {
    label: "Reset",
    icon: ArrowPathIcon,
    onClick: () => {
      return [{name: "reset", timestamp: new Date()}]
    },
  };

/**
 * Base class for action-event based state changes
 */
export abstract class EventAction implements IRuntimeAction {
    constructor(protected event: RuntimeEvent) {}

    abstract apply(   
        runtime: ITimerRuntime,     
        setDisplay: (display: TimerDisplay) => void,
        setButtons: (buttons: ButtonConfig[]) => void,
        setResults: (results: WodResultBlock[]) => void
    ): void;
}
