import React, { useState, useEffect } from "react";

import { TimerEvent, IRuntimeBlock } from "@/core/timer.types";


export interface WodTimerProps {
  block?: IRuntimeBlock;  
  index: number;
  results?: TimerEvent[];
  totalTime: string;
  onTimerEvent?: (timeStamp: Date) => void;  
}

export const WodTimer: React.FC<WodTimerProps> = ({
  block,  
  onTimerEvent,
  index
}) => {    
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["0", "00"]);
  const [activeTime, setActiveTime] = useState<[string, string]>(["0", "00"]);
  const [totalTime, setTotalTime] = useState<[string, string]>(["0", "00"]);  
  const [effort, setEffort] = useState<string>("");
  console.log('WodTimer render with block:', block);
  
  // This effect runs whenever the block or block.events changes
  useEffect(() => {
    if (!block) return;
    
    console.log('WodTimer block or events changed:', block.events);
    
    // Check if timer has started
    const startEvent = block.events?.find(e => e.type === 'start');
    if (!startEvent) {
      console.log('No start event found');
      return;
    }
    
    // Update timer display when block changes
    const updateTimer = () => {
      const now = new Date();
      
      if (startEvent) {
        const elapsed = Math.floor((now.getTime() - startEvent.timestamp.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60).toString();
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
        
        setElapsedTime([`${minutes}:${seconds}`, milliseconds]);
        setActiveTime([`${minutes}:${seconds}`, milliseconds]);
        
        console.log('Timer updated:', `${minutes}:${seconds}.${milliseconds}`);
      }
    };
    
    // Update once immediately
    updateTimer();
    
    // Set up interval for regular updates
    const timer = setInterval(updateTimer, 100);
    
    return () => {
      clearInterval(timer);
    };
  }, [block, block?.events]);
  
  return (
    <div className="w-full flex flex-col items-center justify-center py-4 pb-2 px-1 bg-white space-y-3 border-y-2">
      <div className="w-full shadow-xl">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Left section - Rounds */}
          <div className="bg-gray-50/20 p-4">
            <div className="text-2xl font-semibold text-gray-700">
              Round {(block?.currentRound || 0) + 1}
            </div>
            <div className="text-2xl">{effort}</div>
          </div>

          {/* Middle section - Main Timer */}
          <div className="bg-white p-4 rounded-lg flex items-center justify-center">
            <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">        
              <div className='mx-auto flex items-center'>
                <span className="text-6xl">{elapsedTime[0]}</span>
                <span className="text-gray-600 text-4xl">.{elapsedTime[1]}</span>
              </div>
            </div>
          </div>

          {/* Right section - Elapsed and Total Times */}
          <div className="bg-gray-50/20 p-4">
            <div className="space-y-4">
              <div className="text-gray-600">
                <div className="text-sm uppercase tracking-wide">Total Time</div>
                <div className="text-xl font-mono">{totalTime[0]}</div>
              </div>
              <div className="text-gray-600">
                <div className="text-sm uppercase tracking-wide">Active Time</div>
                <div className="text-xl font-mono">{activeTime[0]}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
