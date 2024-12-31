import React from 'react';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onLap: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onStart,
  onStop,
  onLap
}) => {
  return (
    <div className="flex items-center justify-center space-x-4">
      {isRunning && (
        <button
          onClick={onStop}
          className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-opacity-50"
        >
          Stop
        </button>
      )}
      {!isRunning && (
        <button
          onClick={onStart}
          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
        >
          Start
        </button>
      )}
      {isRunning && (
        <button
          onClick={onLap}
          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
        >
          Lap
        </button>
      )}
    </div>
  );
};
