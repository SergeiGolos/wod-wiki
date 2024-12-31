import React, { useState, useEffect, useContext } from "react";
import { TimeSpan, Timestamp } from "../../lib/timer.types";
import { TimerFromSeconds } from "../../lib/fragments/TimerFromSeconds";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";
import { TimerContext } from "../WodContainer";

export interface WodTimerProps {
  timestamps: Timestamp[];
  duration: number;
  onTimerEvent?: (event: string, data?: any) => void;  
}

export const WodTimer: React.FC<WodTimerProps> = ({
  timestamps,
  duration,
  onTimerEvent,
}) => {
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["0", "00"]);  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const time = useContext(TimerContext);

  
  // Ensure timestamps array is initialized
  useEffect(() => {
        
    if (!timestamps?.length) {
      setElapsedTime(["0", "00"]);
      setIsRunning(false);
      return;
    }

    const spans = [] as TimeSpan[];
    let running = false;
    let timerSum = 0;
    for (let ts of timestamps) {
      if (ts.type === "start" && (spans.length === 0 || spans[spans.length - 1].stop === undefined)) {
          running = true;                  
          const span = new TimeSpan();
          span.start = ts;
          spans.push(span);
      } else if (ts.type === "stop") {
        running = false;
        spans[spans.length - 1].stop = ts;
        timerSum += spans[spans.length - 1].duration();
      }
    }
    
    if (running) {      
      timerSum += spans[spans.length - 1].duration();
    }

    const diffInSeconds = timerSum / 1000;



    if (diffInSeconds > duration) {
      onTimerEvent?.("completed");
    }


    const time = new TimerFromSeconds(Math.abs(diffInSeconds)).toClock();
    setElapsedTime([time[0], time[1][0]]);
    setIsRunning(running);  

    return () => {
    };
  }, [timestamps, time]);

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
