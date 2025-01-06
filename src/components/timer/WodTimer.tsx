import React, { useEffect } from "react";
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
      
  useEffect(() => {    
    const intervalId = setInterval(() => {
      dispatch({ type: 'UPDATE_TIME', payload: new Date() });
    }, 100);

    return () => clearInterval(intervalId);
  }, [dispatch]);
  
  useEffect(() => {
    if (!block) {
      dispatch({ type: 'SET_ELAPSED_TIME', payload: ['0', '00'] });
      dispatch({ type: 'SET_RUNNING', payload: false });
      return;
    }
    
    dispatch({ type: 'SET_BLOCK', payload: block });
    
    // Initialize with default values if no timestamps
    if (!block.timestamps) {
      block.timestamps = [];
    }

    dispatch({ type: 'SET_TIMESTAMPS', payload: block.timestamps });

    if (!block.timestamps.length) {
      dispatch({ type: 'SET_ELAPSED_TIME', payload: ['0', '00'] });
      dispatch({ type: 'SET_RUNNING', payload: false });
      return;
    }
    
    let running = false;    
    let now = new Date();
        
    const elapsed = block.durationHandler?.elapsed(now, block)?.elapsed || 0;      
    const time = new TimerFromSeconds(elapsed).toClock();
    dispatch({ type: 'SET_ELAPSED_TIME', payload: [time[0], time[1][0]] });
    dispatch({ type: 'SET_RUNNING', payload: running });  

    return () => {
    };
  }, [block, dispatch]);

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 bg-white shadow-lg space-y-6
    border-b-2 border-x-2 border-blue-500/50 rounded-b-lg bg-blue-50">
      <TimerDisplay />
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
    <TimerProvider>
      <TimerContent {...props} />
    </TimerProvider>
  );
};
