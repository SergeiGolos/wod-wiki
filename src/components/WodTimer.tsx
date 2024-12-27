import React, { useEffect, useState } from "react";
import { MdTimerFromSeconds } from "../lib/timer.types";

interface Timestamp {
  start: Date;
  stop: Date;
  label?: string;
}

interface WodTimerProps {
  timestamps: Timestamp[];
  block: any;
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
  const [elapsedTime, setElapsedTime] = useState<string>("00:00.0");
  const [currentStartTime, setCurrentStartTime] =
    useState<Timestamp[]>(timestamps);

  // Handle status changes from parent
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const updateTimer = () => {
      const diffInSeconds = timestamps?.reduce((acc, timestamp) => {
        const stopTime = timestamp.stop || new Date();
        return acc + (stopTime.getTime() - timestamp.start.getTime());
      }, 0) / 1000 || 0;
      
      const time = new MdTimerFromSeconds(diffInSeconds).toClock();
      setElapsedTime(time[0] + "." + time[1]);
      onTimerUpdate?.(diffInSeconds);
    };
    
    updateTimer();
    intervalId = setInterval(updateTimer, 100); // Update every 0.1 seconds

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentStartTime, setCurrentStartTime]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg space-y-6 min-w-[300px]">
      <div>
      {block?.effort ? (
        <div className="flex items-center justify-center space-x-2">          
          <span className="text-gray-800 font-semibold">{block.effort}</span>
        </div>
      ) : null}
      </div>
      <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">
        {elapsedTime}
      </div>
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => onTimerEvent?.("stop")}
          className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-opacity-50"
        >
          Stop
        </button>
        <button
          onClick={() => onTimerEvent?.("lap")}
          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
        >
          Lap
        </button>
      </div>
    </div>
  );
};
