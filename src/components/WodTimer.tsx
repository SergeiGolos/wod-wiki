import React, { useEffect, useState } from 'react';
import { MdTimerFromSeconds } from '../lib/timer.types';

interface WodTimerProps {
  startTime: Date;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  status?: 'idle' | 'running' | 'paused';
}

export const WodTimer: React.FC<WodTimerProps> = ({ 
  startTime: initialStartTime,
  onStart, 
  onPause, 
  onReset,
  status = 'running'
}) => {
  const [elapsedTime, setElapsedTime] = useState<string>('00:00.0');
  const [currentStartTime, setCurrentStartTime] = useState<Date>(initialStartTime);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateTimer = () => {
      const now = new Date();
      const diffInMs = now.getTime() - currentStartTime.getTime();
      const timer = new MdTimerFromSeconds(diffInMs / 1000);
      const [time] = timer.toClock();
      setElapsedTime(time);
    };

    if (status === 'running') {
      updateTimer();
      intervalId = setInterval(updateTimer, 100); // Update every 0.1 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentStartTime, status]);

  const handleStart = () => {
    setCurrentStartTime(new Date());
    onStart?.();
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg space-y-6 min-w-[300px]">
      <div className="text-6xl font-mono font-bold text-gray-800 tracking-wider">
        {elapsedTime}
      </div>
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={onReset}
          className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-opacity-50"
        >
          Stop
        </button>
        {status !== 'running' && (
          <button
            onClick={handleStart}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50"
          >
            Lap
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
      </div>
    </div>
  );
};
