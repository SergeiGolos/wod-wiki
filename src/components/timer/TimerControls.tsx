import React from 'react';
import { useTimer } from './TimerContext';

interface TimerControlsProps {
  onStart: () => void;
  onStop: () => void;
  onLap: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  onStart,
  onStop,
  onLap
}) => {
  const { state } = useTimer();
  const { isRunning } = state;

  return (
    <div className="flex space-x-4 justify-center">
      {!isRunning ? (
        <button
          onClick={onStart}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Start
        </button>
      ) : (
        <>
          <button
            onClick={onStop}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Stop
          </button>
          <button
            onClick={onLap}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Lap
          </button>
        </>
      )}
    </div>
  );
};
