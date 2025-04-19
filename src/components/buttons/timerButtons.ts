import { PlayIcon, ArrowPathIcon, PauseIcon, FlagIcon, FolderArrowDownIcon } from "@heroicons/react/24/solid";
import { ActionButton } from "@/core/timer.types";



export const startButton: ActionButton = {
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


  export const resumeButton: ActionButton = {
    label: "Resume",
    icon: PlayIcon,
    onClick: () => {
      return [{name: "start", timestamp: new Date()}]
    },
  };

  export const pauseButton: ActionButton = {
    label: "Pause",
    icon: PauseIcon,
    onClick: () => [{ name: "stop", timestamp: new Date() }],
  };

  export const endButton: ActionButton = {
    label: "End",
    icon: FlagIcon,
    onClick: () => [{ name: "end", timestamp: new Date() }],
  };

  export const resetButton: ActionButton = {
    label: "Reset",
    icon: ArrowPathIcon,
    onClick: () => {
      return [{name: "reset", timestamp: new Date()}]
    },
  };

  export const completeButton: ActionButton = {
    label: "Complete",
    icon: ArrowPathIcon,
    onClick: () => {
      return [{name: "complete", timestamp: new Date()}]
    },
  };

  export const saveButton: ActionButton = {
    label: "Save",
    icon: FolderArrowDownIcon,
    onClick: () => [{ name: "save", timestamp: new Date() }],
  };
