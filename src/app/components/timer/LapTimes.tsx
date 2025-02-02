import { RuntimeBlock } from "@/lib/RuntimeBlock";
import React, { useMemo } from "react";

interface LapTime {
  lapNumber: number;
  timeStr: string;
  childIndex: number;
}

interface LapTimesProps {
  lookup: (id: number) => [RuntimeBlock | undefined, number] | undefined;
  timestamps: Timestamp[];
  block?: RuntimeBlock;
}

export const LapTimes: React.FC<LapTimesProps> = ({ timestamps, block, lookup }) => {
  const lapTimes = useMemo(() => {
    const laps = timestamps.filter((ts) => ts.type === "lap");
    const startTime = timestamps.find((ts) => ts.type === "start")?.time;
    const blockChildren = block?.block?.children?.length || 1;

    return laps.map((lap, index) => {
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
        timeStr,
        childIndex: blockChildren > 0 ? (index % blockChildren) + 1 : index + 1
      };
    });
  }, [timestamps, block]);

  if (!lapTimes.length) return null;

  return (
    <div className="border-x-2 border-green-500/50">      
      <div className="flex flex-col space-y-2">
        {lapTimes.map((lap) => (
          <div
            key={lap.lapNumber}
            className="bg-white px-3 py-2 rounded shadow-sm flex justify-between items-center"
          >
            <div className="text-sm text-gray-500">
              {block && block.block && block.block.children && block.block.children.length > 0
                ? `Block ${lookup(block.block.children[lap.childIndex - 1])?.[0]?.id} - `
                : ''}
              Lap {lap.lapNumber}
            </div>
            <div className="font-medium">{lap.timeStr}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
