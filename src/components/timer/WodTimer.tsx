import React, { useState, useEffect } from "react";
import { ResultSpan } from "../../lib/Timespan";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { TimerFromSeconds } from "../../lib/fragments/TimerFromSeconds";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";

export interface WodTimerProps {
  block?: RuntimeBlock;  
  onTimerEvent?: (event: string, data?: any) => void;  
}

export const WodTimer: React.FC<WodTimerProps> = ({
  block,  
  onTimerEvent,
}) => {
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["0", "00"]);  
  const [isRunning, setIsRunning] = useState<boolean>(false);
      
  const [time, setTime] = useState(new Date());
  useEffect(() => {    
    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 100);

    return () => clearInterval(intervalId);
  }, []);
  

  useEffect(() => {
    if (!block) {
      setElapsedTime(["0", "00"]);
      setIsRunning(false);
      return;
    }
    
    // Initialize with default values if no timestamps
    if (!block.timestamps) {
      block.timestamps = [];
    }

    if (!block.timestamps.length) {
      setElapsedTime(["0", "00"]);
      setIsRunning(false);
      return;
    }

    const spans = [] as ResultSpan[];
    let running = false;
    let timerSum = 0;
    for (let ts of block.timestamps) {
      if (ts.type === "start" && (spans.length === 0 || spans[spans.length - 1].stop !== undefined)) {
          running = true;                  
          const span = new ResultSpan();
          span.start = ts;
          spans.push(span);
      } else if (ts.type === "stop") {
        if (spans.length > 0 && !spans[spans.length - 1].stop) {
          running = false;
          spans[spans.length - 1].stop = ts;
          timerSum += spans[spans.length - 1].duration();
        }
      }
    }
    
    if (running) {      
      timerSum += spans[spans.length - 1].duration();
    }

    const diffInSeconds = timerSum / 1000;

    // Only complete if we're running, in countdown mode and reached duration
    if (running && (diffInSeconds >= block.duration && !(block.increment > 0 && block.duration  == 0))) {
      onTimerEvent?.("lap");
    }

    const elapsed = block.increment > 0
      ? Math.abs(diffInSeconds)  
      : block.duration - Math.abs(diffInSeconds);

      
    const time = new TimerFromSeconds(elapsed).toClock();
    setElapsedTime([time[0], time[1][0]]);
    setIsRunning(running);  

    return () => {
    };
  }, [block, time]);

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 bg-white shadow-lg space-y-6
    border-b-2 border-x-2 border-blue-500/50 rounded-b-lg bg-blue-50">
      <TimerDisplay elapsedTime={elapsedTime} />
      <TimerControls
        isRunning={isRunning}
        onStart={() => onTimerEvent?.("started")}
        onStop={() => onTimerEvent?.("stop")}
        onLap={()=> onTimerEvent?.("lap")}
      />
    </div>
  );
};
