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

  // Ensure timestamps array is initialized
  useEffect(() => {
    if (!timestamps) {
      console.warn('Timestamps array is undefined');
      return;
    }
  }, [timestamps]);

  const handleStop = () => {
    if (!timestamps?.length) return;
    
    const last = timestamps[timestamps.length - 1];
    if (last && last.stop === undefined) {
      onTimerEvent?.("stop", block.id);
    }    
  };

  const handleStart = () => {    
    if (!timestamps) return;
    
    const last = timestamps[timestamps.length - 1];
    // Only start if there's no active timer
    if (!last || last.stop !== undefined) {
      onTimerEvent?.("started", block.id);
    }
  };

  const handleLap = () => {
    if (!timestamps?.length) return;

    const last = timestamps[timestamps.length - 1];
    if (last?.stop !== undefined) {
      return;
    }
    onTimerEvent?.("lap", block.id);
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateTimer = () => {
      if (!timestamps?.length) {
        setElapsedTime(["0", "0"]);
        setIsRunning(false);
        return;
      }

      const lastTimestamp = timestamps[timestamps.length - 1];
      const running = lastTimestamp.stop === undefined;

      let diffInSeconds = timestamps.reduce((acc, timestamp) => {
        if (!timestamp.start) return acc;
        const stopTime = timestamp.stop || new Date();
        return acc + (stopTime.getTime() - timestamp.start.getTime());
      }, 0) / 1000;

      if ((block?.duration && diffInSeconds > block.duration) || block.duration === 0) {
        onTimerEvent?.("complete", block.id);
      }
      onTimerUpdate?.(diffInSeconds);

      // Calculate display time based on increment direction
      let displayTime = diffInSeconds;
      if (block?.increment) {
        if (block.increment > 0) {
          displayTime = diffInSeconds;
        } else if (block.increment < 0 && block.duration) {
          displayTime = Math.max(0, block.duration - diffInSeconds);
        }
      }

      const time = new TimerFromSeconds(Math.abs(displayTime)).toClock();
      setElapsedTime([time[0], time[1][0]]);
      setIsRunning(running);
    };

    updateTimer();
    intervalId = setInterval(updateTimer, 100);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timestamps, block, onTimerUpdate, onTimerEvent]);

  return {
    elapsedTime,
    isRunning,
    handleStart,
    handleStop,
    handleLap
  };
};
