import React, { useEffect, useState, useRef } from "react";
import { RuntimeBlock } from "../../lib/RuntimeBlock";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";
import { TimerProvider, useTimer } from "./TimerContext";
import { TimerFromSeconds } from "../../lib/fragments/TimerFromSeconds";

export interface WodTimerProps {
  block?: RuntimeBlock;  
  onTimerEvent?: (event: string, data?: any) => void;  
}

const TimerContent: React.FC<WodTimerProps> = ({
  block,  
  onTimerEvent,
}) => {
  const { state, dispatch } = useTimer();
  const [elapsedTime, setElapsedTime] = useState<[string, string]>(["0", "00"]);
  const [time, setTime] = useState(new Date());
  const lastRunningState = useRef(false);
      
  useEffect(() => {    
    if (state.isRunning) {
      const intervalId = setInterval(() => {
        setTime(new Date());
      }, 100);

      return () => clearInterval(intervalId);
    }
  }, [state.isRunning]);
  
  useEffect(() => {
    if (!block) {
      setElapsedTime(["0", "00"]);
      if (lastRunningState.current) {
        lastRunningState.current = false;
        dispatch({ type: 'SET_RUNNING', payload: false });
      }
      return;
    }
    
    // Initialize with default values if no timestamps
    if (!block.timestamps) {
      block.timestamps = [];
    }

    if (!block.timestamps.length) {
      setElapsedTime(["0", "00"]);
      if (lastRunningState.current) {
        lastRunningState.current = false;
        dispatch({ type: 'SET_RUNNING', payload: false });
      }
      return;
    }
    
    let now = new Date();
    const lastTimestamp = block.timestamps[block.timestamps.length - 1];
    const running = lastTimestamp?.type === "start" || lastTimestamp?.type === "lap";
        
    const elapsed = block.durationHandler?.elapsed(now, block)?.elapsed || 0;      
    const timeArr = new TimerFromSeconds(elapsed).toClock();
    setElapsedTime([timeArr[0], timeArr[1][0]]);
    
    if (running !== lastRunningState.current) {
      lastRunningState.current = running;
      dispatch({ type: 'SET_RUNNING', payload: running });
    }

  }, [block, time]);

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 bg-white shadow-lg space-y-6
    border-b-2 border-x-2 border-blue-500/50 rounded-b-lg bg-blue-50">
      <TimerDisplay elapsedTime={elapsedTime} />
      <TimerControls
        onStart={() => onTimerEvent?.("started")}
        onStop={() => onTimerEvent?.("stop")}
        onLap={()=> onTimerEvent?.("lap")}
      />
    </div>
  );
};

export const WodTimer: React.FC<WodTimerProps> = (props) => {
  return (  
      <TimerContent {...props} />    
  );
};
