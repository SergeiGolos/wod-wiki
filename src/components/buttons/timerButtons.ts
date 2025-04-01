import { PlayIcon, StopIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { ButtonConfig } from "@/core/timer.types";



export const startButton: ButtonConfig = {
    label: "Run",
    icon: PlayIcon,
    onClick: () => {
      const time = new Date();
      return [
        {name: "begin", timestamp: time},
        {name: "start", timestamp: time}
      ]
    },
  };


  export const resumeButton: ButtonConfig = {
    label: "Resume",
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

  export const completeButton: ButtonConfig = {
    label: "Complete",
    icon: ArrowPathIcon,
    onClick: () => {
      return [{name: "complete", timestamp: new Date()}]
    },
  };
