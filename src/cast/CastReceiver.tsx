import React, { useEffect, useCallback } from 'react';
import { WodTimer } from '@/components/clock/WodTimer';
import { TimerDisplayBag, TimerFromSeconds } from '@/core/timer.types';

interface Event {
  id: string;
  type: 'START' | 'STOP' | 'RESET' | 'INITIALIZATION';
  timestamp: number;
  payload: any;
}

interface TimerState {
  isRunning: boolean;
  startTime: number;
  elapsed: number;
}

const CastReceiver: React.FC = () => {
  const [timerState, setTimerState] = React.useState<TimerState>({
    isRunning: false,
    startTime: 0,
    elapsed: 0
  });
  
  const [display, setDisplay] = React.useState<TimerDisplayBag>({
    primary: new TimerFromSeconds(0),
    label: 'Timer',
    bag: { totalTime: new TimerFromSeconds(0) }
  });

  // Timer update logic
  useEffect(() => {
    let intervalId: number;

    if (timerState.isRunning) {
      intervalId = window.setInterval(() => {
        const now = Date.now();
        const elapsed = now - timerState.startTime + timerState.elapsed;
        
        setDisplay(prev => ({
          ...prev,
          primary: new TimerFromSeconds(elapsed / 1000),
          bag: { totalTime: new TimerFromSeconds(elapsed / 1000) }
        }));
      }, 100); // Update every 0.1 seconds
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [timerState.isRunning, timerState.startTime, timerState.elapsed]);

  // Handle timer events
  const handleEvent = useCallback((event: Event) => {
    console.log('Received event:', event);

    switch (event.type) {
      case 'START':
        setTimerState(prev => ({
          ...prev,
          isRunning: true,
          startTime: Date.now()
        }));
        break;
      
      case 'STOP':
        setTimerState(prev => ({
          ...prev,
          isRunning: false,
          elapsed: Date.now() - prev.startTime + prev.elapsed
        }));
        break;
      
      case 'RESET':
        setTimerState({
          isRunning: false,
          startTime: 0,
          elapsed: 0
        });
        setDisplay({
          primary: new TimerFromSeconds(0),
          label: 'Timer',
          bag: { totalTime: new TimerFromSeconds(0) }
        });
        break;
    }
  }, []);

  // Initialize ChromeCast receiver
  useEffect(() => {
    console.log('Initializing ChromeCast receiver app');
    handleEvent({
      id: crypto.randomUUID(),
      type: 'INITIALIZATION',
      timestamp: Date.now(),
      payload: { message: 'ChromeCast receiver initialized' }
    });
  }, [handleEvent]);

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">wod.wiki Cast Receiver</h1>
        <p className="text-gray-400">Displaying workout timer</p>
      </header>

      <div className="timer-container mb-6">
        <WodTimer display={display} />
      </div>
      
      {/* For testing only - this would be removed in production */}
      <div className="mt-6 space-x-4">
        <button
          className="px-4 py-2 bg-green-600 rounded"
          onClick={() => {
            handleEvent({
              id: crypto.randomUUID(),
              type: 'START',
              timestamp: Date.now(),
              payload: { action: 'start' }
            });
          }}
        >
          Start
        </button>
        <button
          className="px-4 py-2 bg-red-600 rounded"
          onClick={() => {
            handleEvent({
              id: crypto.randomUUID(),
              type: 'STOP',
              timestamp: Date.now(),
              payload: { action: 'stop' }
            });
          }}
        >
          Stop
        </button>
        <button
          className="px-4 py-2 bg-yellow-600 rounded"
          onClick={() => {
            handleEvent({
              id: crypto.randomUUID(),
              type: 'RESET',
              timestamp: Date.now(),
              payload: { action: 'reset' }
            });
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default CastReceiver;
