import React from 'react';
import { useTimer } from './TimerContext';

interface TimerDisplayProps {  
}

export const TimerDisplay: React.FC<TimerDisplayProps> = () => {
  const { state } = useTimer();
  const { elapsedTime } = state;

  return (
    <>      
      <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">
        {elapsedTime[0]}
        <span className="text-gray-600 text-4xl">.{elapsedTime[1]}</span>
      </div>
    </>
  );
};
