import { PlayIcon, ArrowPathIcon, PauseIcon, FlagIcon, FolderArrowDownIcon } from "@heroicons/react/24/solid";
import { IActionButton } from "@/core/IActionButton";



export const startButton: IActionButton = {
    label: "Run",
    icon: PlayIcon,
    event: "run",
  };


  export const resumeButton: IActionButton = {
    label: "Resume",
    icon: PlayIcon,
    event: "start",
  };

  export const pauseButton: IActionButton = {
    label: "Pause",
    icon: PauseIcon,
    event: "stop",
  };

  export const endButton: IActionButton = {
    label: "End",
    icon: FlagIcon,
    event: "end",
  };

  export const resetButton: IActionButton = {
    label: "Reset",
    icon: ArrowPathIcon,
    event: "reset",
  };

  export const completeButton: IActionButton = {
    label: "Complete",
    icon: ArrowPathIcon,
    event: "complete",
  };

  export const saveButton: IActionButton = {
    label: "Save",
    icon: FolderArrowDownIcon,
    event: "save",
  };
