import React, { useEffect, useState, useRef, useCallback } from "react";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";
import { TimerFromSeconds } from "../../lib/fragments/TimerFromSeconds";

export interface WodTimerProps {
  block?: RuntimeBlock;  
  onTimerEvent?: (event: string, data?: any) => void;  
}

const TimerContent: React.FC<WodTimerProps> = ({
  block,  
  onTimerEvent,
}) => {  
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["0", "00"]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBlock = useRef(block);
  const isInitialMount = useRef(true);
  
  const updateElapsedTime = useCallback(() => {
    if (!block || !block.timestamps || !block.timestamps.length) return;
    
    const now = new Date();
    const elapsed = block.durationHandler?.elapsed(now, block)?.elapsed || 0;      
    const timeArr = new TimerFromSeconds(elapsed).toClock();
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
  }, [updateElapsedTime]);
  
 
  return (
    <div className="w-full flex flex-col items-center justify-center p-2 bg-white shadow-lg space-y-6
    border-b-2 border-x-2 border-blue-500/50 rounded-b-lg bg-blue-50">
      <TimerDisplay elapsedTime={elapsedTime} />
      <TimerControls
        onStart={() => onTimerEvent?.("started", block)}
        onStop={() => onTimerEvent?.("stop", block)}
        onLap={()=> onTimerEvent?.("lap", block)}
      />
    </div>
  );
};

export const WodTimer: React.FC<WodTimerProps> = (props) => {
  return (  
      <TimerContent {...props} />    
  );
};
