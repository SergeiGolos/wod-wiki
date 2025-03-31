import React, { useState, useEffect } from "react";

import { TimerDisplayBag, TimerFromSeconds } from "@/core/timer.types";


export interface WodTimerProps {
  display: TimerDisplayBag;
}


export const WodTimer: React.FC<WodTimerProps> = ({
  display  
}) => {    
  
  const [clock, setClock] = useState<[string,string]>(["",""]);
useEffect(() => {
  let time = new TimerFromSeconds(display.elapsed);
  setClock(time.toClock());
}, [display]);

  // This effect runs whenever the block or block.events changes  
  return (
    <div className="w-full flex flex-col items-center justify-center py-4 pb-2 px-1 bg-white space-y-3 border-y-2">
      <div className="w-full shadow-xl">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Left section - Rounds */}
          <div className="bg-gray-50/20 p-4">
            <div className="text-2xl font-semibold text-gray-700">
              Round {(display?.round || 0) + 1}
            </div>
            <div className="text-2xl">{display?.label}</div>
          </div>

          {/* Middle section - Main Timer */}
          <div className="bg-white p-4 rounded-lg flex items-center justify-center">
            <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">        
              <div className='mx-auto flex items-center'>
                <span className="text-6xl">{clock[0]}</span>
                <span className="text-gray-600 text-4xl">.{clock[1][0]}</span>
              </div>
            </div>
          </div>

          {/* Right section - Elapsed and Total Times */}
          {/* <div className="bg-gray-50/20 p-4">
            <div className="space-y-4">
              <div className="text-gray-600">
                <div className="text-sm uppercase tracking-wide">Total Time</div>
                <div className="text-xl font-mono">{display.totalTime}</div>
              </div>
              <div className="text-gray-600">
                <div className="text-sm uppercase tracking-wide">Active Time</div>
                <div className="text-xl font-mono">{display?.activeTime}</div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};
