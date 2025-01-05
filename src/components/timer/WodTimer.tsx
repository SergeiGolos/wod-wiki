import React, { useState, useEffect, useContext } from "react";
import { RuntimeBlock, Timespan, Timestamp } from "../../lib/timer.types";
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

    const spans = [] as Timespan[];
    let running = false;
    let timerSum = 0;
    for (let ts of block.timestamps) {
      if (ts.type === "start" && (spans.length === 0 || spans[spans.length - 1].stop !== undefined)) {
          running = true;                  
          const span = new Timespan();
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
      onTimerEvent?.("completed");
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
    <div className="w-full flex flex-col items-center justify-center p-6 bg-white rounded-sm shadow-lg space-y-6">
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
