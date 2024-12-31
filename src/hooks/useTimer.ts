import { useEffect, useState } from "react";
import { DisplayBlock, Timestamp } from "../lib/timer.types";
import { TimerFromSeconds } from "../lib/fragments/TimerFromSeconds";

interface UseTimerProps {
  timestamps: Timestamp[];
  block: DisplayBlock;
  onTimerUpdate?: (elapsedTime: number) => void;
  onTimerEvent?: (event: string, data?: any) => void;
}

export const useTimer = ({ timestamps, block, onTimerUpdate, onTimerEvent }: UseTimerProps) => {
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["*","*"]);
  const [isRunning, setIsRunning] = useState(false);

  const handleStop = () => {
    const last = timestamps?.length && timestamps[timestamps.length - 1];
    if (last && last.stop === undefined) {
      onTimerEvent?.("stop", block.id);
    }    
  };

  const handleStart = () => {    
    const last = timestamps?.length && timestamps[timestamps.length - 1];
    onTimerEvent?.("started", block.id);
  };

  const handleLap = () => {
    const last = (timestamps?.length && timestamps[timestamps.length - 1]) as Timestamp;
    if (last && last.stop !== undefined) {
      return;
    }
    onTimerEvent?.("lap", block.id);
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateTimer = () => {
      const running = (timestamps?.length || 0) > 0 &&
        timestamps[timestamps.length - 1].stop === undefined;
      setIsRunning(running);

      if (!isRunning && elapsedTime[0] !== "*") {
        return;
      }

      let diffInSeconds =
        timestamps?.reduce((acc, timestamp) => {
          const stopTime = timestamp.stop || new Date();
          return acc + (stopTime.getTime() - timestamp.start.getTime());
        }, 0) / 1000 || 0;

      if (block?.duration && diffInSeconds > block.duration || block.duration === 0) {
        onTimerEvent?.("complete", block.id);
      }
      onTimerUpdate?.(diffInSeconds);

      // Calculate display time based on increment direction
      let displayTime = diffInSeconds;
      if (block?.increment) {
        if (block.increment > 0) {
          // Count up from 0 to duration
          displayTime = diffInSeconds;
        } else if (block.increment < 0 && block.duration) {
          // Count down from duration to 0
          displayTime = block.duration - diffInSeconds;
        }
      }

      const time = new TimerFromSeconds(Math.abs(displayTime)).toClock();
      setElapsedTime([time[0], time[1][0]]);    
    };

    updateTimer();
    intervalId = setInterval(updateTimer, 100);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  });

  return {
    elapsedTime,
    isRunning,
    handleStart,
    handleStop,
    handleLap
  };
};
