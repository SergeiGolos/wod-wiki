import React, { useEffect, useState, useRef, useCallback } from "react";

import { RuntimeBlock } from "../../../lib/RuntimeBlock";
import { TimerFromSeconds } from "../../../lib/fragments/TimerFromSeconds";
import { TimerEvent } from "@/lib/timer.runtime";

export interface WodTimerProps {
  block?: RuntimeBlock;  
  index: number;
  results?: TimerEvent[];
  stack?: RuntimeBlock[];
  totalTime: string;
  onTimerEvent?: (event: string, data?: any) => void;  
}

export const WodTimer: React.FC<WodTimerProps> = ({
  block,  
  index,  
  results,
  stack,
  totalTime,
  onTimerEvent,
}) => {  
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["0", "00"]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateElapsedTime = useCallback(() => {
    if (!block || !results) return;
    
    const now = new Date();
    const elapsed = block.durationHandler?.elapsed(now, block)?.elapsed || 0;      
    
    const timeArr = new TimerFromSeconds(elapsed).toClock();
    
    console.log('Elapsed:',elapsed, timeArr, results);
    setElapsedTime([timeArr[0], timeArr[1][0]]);
    onTimerEvent?.('elapsed', { elapsed, time: timeArr });   

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
    <div className="w-full flex flex-col items-center justify-center py-4 pb-2 px-1 bg-white space-y-3
    border-y-2">
      <div className="w-full shadow-xl">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Left section - 1/3 width on desktop */}
          <div className="bg-gray-50/20 p-4">
            <div className="space-y-4">
              <div className="text-2xl font-semibold text-gray-700">
                Round {index + 1}/{stack?.length || 0}
              </div>
              <div className="text-gray-600">
                <div className="text-sm uppercase tracking-wide">Total Time</div>
                <div className="text-xl font-mono">{totalTime}</div>
              </div>
            </div>
          </div>

          {/* Right section - 2/3 width on desktop */}
          <div className="md:col-span-2 bg-white p-4 rounded-lg">
            <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">        
              <div className='mx-auto'>
                {elapsedTime[0]}
                <span className="text-gray-600 text-4xl">.{elapsedTime[1]}</span>
              </div>
              <div className='text-2xl'>Macebell Touchdowns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
