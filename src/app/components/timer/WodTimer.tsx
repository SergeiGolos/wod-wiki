import React, { useEffect, useState, useRef, useCallback } from "react";

import { TimerDisplay } from "./TimerDisplay";
import { RuntimeBlock } from "../../../lib/RuntimeBlock";
import { TimerFromSeconds } from "../../../lib/fragments/TimerFromSeconds";
import { TimerEvent } from "@/lib/timer.runtime";


export interface WodTimerProps {
  block?: RuntimeBlock;  
  results?: TimerEvent[];
  onTimerEvent?: (event: string, data?: any) => void;  
}

const TimerContent: React.FC<WodTimerProps> = ({
  block,  
  results,
  onTimerEvent,
}) => {  
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["0", "00"]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateElapsedTime = useCallback(() => {
    if (!block || !results) return;
    
    const now = new Date();
    const elapsed = block.durationHandler?.elapsed(now, block)?.elapsed || 0;      
    const timeArr = new TimerFromSeconds(elapsed).toClock();
    console.log('Elapsed:', timeArr, results);
    setElapsedTime([timeArr[0], timeArr[1][0]]);
  }, [block]);
  
  useEffect(() => {

    updateElapsedTime(); // Update immediately
    intervalRef.current = setInterval(updateElapsedTime, 100);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
  
 
  return (
    <div className="w-full flex flex-col items-center justify-center py-4 p-2 bg-white space-y-3
    border-y-2 border-blue-500/50 shadow-xl">
      <TimerDisplay elapsedTime={elapsedTime} />      
    </div>
  );
};

export const WodTimer: React.FC<WodTimerProps> = (props) => {
  return (  
      <TimerContent {...props} />    
  );
};
