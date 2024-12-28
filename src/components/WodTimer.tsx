import React, { useEffect, useState } from "react";
import { DisplayBlock, TimerFromSeconds } from "../lib/timer.types";
import { Timestamp } from "../lib/timer.types";

export interface WodTimerProps {
  timestamps: Timestamp[];
  block: DisplayBlock;
  onTimerUpdate?: (elapsedTime: number) => void;
  onTimerEvent?: (event: string, data?: any) => void;
  elapsedTime?: number;  
}

export const WodTimer: React.FC<WodTimerProps> = ({
  timestamps,
  block,
  onTimerUpdate,
  onTimerEvent,
}) => {
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["*","*"]);
  const [laps, setLaps] = useState<number>(0);
  // const [currentStartTime, setCurrentStartTime] =
  //   useState<Timestamp[]>(timestamps);
  const [isRunning, setIsRunning] = useState(false);

  const handleStop = () => {
    const last = timestamps?.length && timestamps[timestamps.length - 1];
    if (last && last.stop === undefined) {
      last.stop = new Date();
    }
    onTimerEvent?.("stop");
  };

  const handleStart = () => {    
    const last = timestamps?.length && timestamps[timestamps.length - 1];
    if (last && last.stop !== undefined) {
      timestamps.push({
        start: new Date(),
        stop: undefined
      })
    }
    onTimerEvent?.("started");
  };

  const handleLap = () => {
    const last = (timestamps?.length && timestamps[timestamps.length - 1]) as Timestamp;
    if (last && last.stop !== undefined) {
      return;
    }
    setLaps(laps + 1);
    last.stop = new Date();
    last.label = `Lap ${laps}`;
    timestamps.push({
      start: new Date(),
      stop: undefined
    })
    
    onTimerEvent?.("lap");
  };

  // Handle status changes from parent
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateTimer = () => {
      setIsRunning(
        (timestamps?.length || 0) > 0 &&
          timestamps[timestamps.length - 1].stop === undefined
      );

      if (!isRunning && elapsedTime[0] !== "*") {
        return;
      }

      const diffInSeconds =
        timestamps?.reduce((acc, timestamp) => {
          const stopTime = timestamp.stop || new Date();
          return acc + (stopTime.getTime() - timestamp.start.getTime());
        }, 0) / 1000 || 0;

      const time = new TimerFromSeconds(diffInSeconds).toClock();
      setElapsedTime([time[0], time[1][0]]);
      onTimerUpdate?.(diffInSeconds);
    };

    updateTimer();
    intervalId = setInterval(updateTimer, 100); // Update every 0.1 seconds

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  });

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg space-y-6 min-w-[300px]">
      <div>
        {block.block?.effort ? (
          <div className="flex items-center justify-center space-x-2">
            <span className="text-gray-800 font-semibold">
              {block.block.effort}
            </span>
          </div>
        ) : null}
      </div>

      <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">
        {elapsedTime[0]}
        <span className="text-gray-600 text-4xl">.{elapsedTime[1]}</span>
      </div>
      <div className="flex items-center justify-center space-x-4">
        {isRunning && (
          <button
            onClick={handleStop}
            className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-opacity-50"
          >
            Stop
          </button>
        )}
        {!isRunning && (
          <button
            onClick={handleStart}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
          >
            Start
          </button>
        )}
        {isRunning && (
          <button
            onClick={handleLap}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
          >
            Lap
          </button>
        )}
      </div>
    </div>
  );
};
