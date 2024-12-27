import React from 'react';

interface WodTimerProps {
  time: string;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  status?: 'idle' | 'running' | 'paused';
}

export const WodTimer: React.FC<WodTimerProps> = ({ 
  time, 
  onStart, 
  onPause, 
  onReset,
  status = 'idle'
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg space-y-6 min-w-[300px]">
      <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">
        {time}
      </div>
      <div className="flex items-center justify-center space-x-4">
        {status !== 'running' && (
          <button
            onClick={onStart}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
          >
            Start
          </button>
        )}
        {status === 'running' && (
          <button
            onClick={onPause}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-50"
          >
            Pause
          </button>
        )}
        <button
          onClick={onReset}
          className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-opacity-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
