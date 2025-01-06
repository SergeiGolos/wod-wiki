import React from 'react';

interface TimerDisplayProps {
  elapsedTime: [string, string];
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ elapsedTime }) => {
  return (
    <>      
      <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">
        {elapsedTime[0]}
        <span className="text-gray-600 text-4xl">.{elapsedTime[1]}</span>
      </div>
    </>
  );
};
