import React from 'react';
import { DisplayBlock } from '../../lib/timer.types';

interface TimerDisplayProps {
  block: DisplayBlock;
  elapsedTime: [string, string];
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ block, elapsedTime }) => {
  return (
    <>
      <div>        
        <div className="flex items-center justify-center space-x-2">
          <span className="text-gray-800 font-semibold text-2xl">
            {block.getParts().join(" ")}
          </span>
        </div>        
      </div>

      <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">
        {elapsedTime[0]}
        <span className="text-gray-600 text-4xl">.{elapsedTime[1]}</span>
      </div>
    </>
  );
};
