import React, { useEffect, useState } from "react";
import { Timestamp } from "../../lib/timer.types";

interface LapTime {
  lapNumber: number;
  timeStr: string;
}

interface LapTimesProps {
  timestamps: Timestamp[];
}

export const LapTimes: React.FC<LapTimesProps> = ({ timestamps }) => {
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);

  useEffect(() => {
    const laps = timestamps.filter((ts) => ts.type === "lap");
    const startTime = timestamps.find((ts) => ts.type === "start")?.time;

    const calculatedLaps = laps.map((lap, index) => {
      const lapTime = lap.time;
      const previousTime = index === 0 
        ? startTime 
        : laps[index - 1].time;

      const timeStr =
        previousTime && lapTime
          ? (() => {
              const time = (lapTime.getTime() - previousTime.getTime()) / 1000;
              const minutes = Math.floor(time / 60);
              const seconds = Math.floor(time % 60);
              return `${minutes}:${seconds.toString().padStart(2, "0")}`;
            })()
          : "--:--";

      return {
        lapNumber: index + 1,
        timeStr
      };
    });

    setLapTimes(calculatedLaps);
  }, [timestamps]);

  return (
    <div className="mt-2">      
      <div className="grid grid-cols-4 gap-2">
        {lapTimes.map((lap) => (
          <div
            key={lap.lapNumber}
            className="bg-white px-3 py-2 rounded shadow-sm"
          >
            <div className="text-xs text-gray-500">
              Lap {lap.lapNumber}
            </div>
            <div className="font-medium">{lap.timeStr}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
