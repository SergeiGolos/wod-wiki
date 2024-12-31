import React, { useState, useEffect } from "react";
import { TimeSpan, Timestamp } from "../../lib/timer.types";
import { TimerFromSeconds } from "../../lib/fragments/TimerFromSeconds";
import { TimerDisplay } from "./TimerDisplay";

export interface WodTimerProps {
  timestamps: Timestamp[];
  onTimerEvent?: (event: string, data?: any) => void;
  elapsedTime?: number;
}

export const WodTimer: React.FC<WodTimerProps> = ({
  timestamps,
  onTimerEvent,
}) => {
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["*", "*"]);
  const [isRunning, setIsRunning] = useState(false);

  // Ensure timestamps array is initialized
  useEffect(() => {
    if (!timestamps) {
      console.warn("Timestamps array is undefined");
      return;
    }
  }, [timestamps]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateTimer = () => {
      if (!timestamps?.length) {
        setElapsedTime(["0", "0"]);
        setIsRunning(false);
        return;
      }

      const spans = [] as TimeSpan[];
      let running = false;
      let duration = 0;
      for (let ts of timestamps) {
        if (ts.type === "start" && (spans.length === 0 || spans[spans.length - 1].stop === undefined)) {
            running = true;                  
            spans.push({ start: ts } as TimeSpan);
        } else if (ts.type === "stop") {
          running = false;
          spans[spans.length - 1].stop = ts;
          duration += spans[spans.length - 1].duration();
        }
      }

      if (running) {
        duration += spans[spans.length - 1].duration();
      }

      const diffInSeconds = duration / 1000;
      const time = new TimerFromSeconds(Math.abs(diffInSeconds)).toClock();
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
  }, [timestamps]);

  const onStart = () => onTimerEvent?.("started");
  const onStop = () => onTimerEvent?.("stop");
  const onLap = () => onTimerEvent?.("lap");

  return (
    <div className="w-full flex flex-col items-center justify-center p-6 bg-white rounded-sm shadow-lg space-y-6">
      <TimerDisplay elapsedTime={elapsedTime} />
      <div className="flex items-center justify-center space-x-4">
        {isRunning && (
          <button
            onClick={onStop}
            className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-opacity-50"
          >
            Stop
          </button>
        )}
        {!isRunning && (
          <button
            onClick={onStart}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
          >
            Start
          </button>
        )}
        {isRunning && (
          <button
            onClick={onLap}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
          >
            Lap
          </button>
        )}
      </div>
    </div>
  );
};
