import React, { useState, useEffect, useCallback } from 'react';
// import { CastReceiver } from '@/cast/CastReceiver'; // Keep if needed for other parts, but not for this display mock
// import { EditorContainer } from '@/components/editor/EditorContainer'; // Keep if needed for other parts
import {
  ChromecastEventType,
  isClockRunningEvent, // Added missing import
  isClockPausedEvent,
  isClockIdleEvent,
  ChromecastEvent,
} from '@/cast/types/chromecast-events';
import { TimerFromSeconds, TimerDisplayBag } from '@/core/timer.types'; // Added ITimerDisplay

// Define the initial display state
const initialDisplay: TimerDisplayBag = {
  primary: new TimerFromSeconds(0),
  label: 'Ready',
  bag: {
    totalTime: new TimerFromSeconds(0),
  }
};

export const MockChromecastReceiver: React.FC = () => {
  // State for the receiver's display
  const [display, setDisplay] = useState<TimerDisplayBag>(initialDisplay);
  // State for the receiver's operational status
  const [receiverState, setReceiverState] = useState<'RUNNING' | 'PAUSED' | 'IDLE'>('IDLE');
  // State for event history (for debugging)
  const [eventHistory, setEventHistory] = useState<{
    time: string;
    eventType: ChromecastEventType;
    data: string;
  }[]>([]);
  // State to toggle debug view
  const [debug, setDebug] = useState(true); // Control debug panel visibility

  // Callback function to process incoming Chromecast events
  const processEvent = useCallback((event: ChromecastEvent) => {
    const now = new Date().toLocaleTimeString();
    // Update event history, stringifying data for display
    setEventHistory(prev => [...prev, {
      time: now,
      eventType: event.type,
      data: JSON.stringify(event.data, null, 2)
    }].slice(-20)); // Keep only the last 20 events

    // Update display and state based on event type
    if (isClockRunningEvent(event)) {
      const { timerValue, effort, roundCurrent, roundTotal, repetitions } = event.data;
      let label = `▶️ ${effort || 'Workout'}`; // Default effort if missing
      if (repetitions) {
        label += ` - ${repetitions} reps`;
      }
      if (roundTotal && roundTotal > 0) {
        label += ` (Round ${roundCurrent}/${roundTotal})`;
      } else if (roundCurrent) { // Show current round even if no total
        label += ` (Round ${roundCurrent})`;
      }
      setDisplay({
        primary: new TimerFromSeconds(timerValue),
        label,
        bag: { totalTime: new TimerFromSeconds(timerValue) }
      });
      setReceiverState('RUNNING');
    } else if (isClockPausedEvent(event)) {
      const { timerValue, effort, roundCurrent, roundTotal, repetitions } = event.data;
      let label = `⏸️ ${effort || 'Workout'}`; // Default effort if missing
      if (repetitions) {
        label += ` - ${repetitions} reps`;
      }
      if (roundTotal && roundTotal > 0) {
        label += ` (Round ${roundCurrent}/${roundTotal})`;
      } else if (roundCurrent) {
        label += ` (Round ${roundCurrent})`;
      }
      setDisplay({
        primary: new TimerFromSeconds(timerValue),
        label,
        bag: { totalTime: new TimerFromSeconds(timerValue) }
      });
      setReceiverState('PAUSED');
    } else if (isClockIdleEvent(event)) {
      const { message } = event.data;
      setDisplay({
        primary: new TimerFromSeconds(0),
        label: message || 'Ready',
        bag: {
          totalTime: new TimerFromSeconds(0),
          currentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      });
      setReceiverState('IDLE');
    }
    // Add handling for other event types if necessary
  }, []); // processEvent definition is stable

  // Effect to expose the processEvent function globally for mocking/testing in Storybook/dev tools
  useEffect(() => {
    window.__mockChromecastReceiver = { processEvent };
    // Cleanup function
    return () => {
      delete window.__mockChromecastReceiver;
    };
  }, [processEvent]);

  // Main component render - Focused on the Receiver Display
  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 flex flex-col font-sans"> {/* Assuming font-sans */}
      {/* Receiver Display Area */}
      <div className="flex-grow flex items-center justify-center bg-black rounded-lg relative p-8 mb-4 shadow-lg"> {/* Added shadow */}
        <div className="text-center">
          {/* Conditional rendering based on receiver state */}
          {receiverState === 'IDLE' ? (
            // Idle state shows current time
            <div>
              <div className="text-5xl sm:text-7xl font-bold mb-2 tracking-wider"> {/* Responsive text */}
                {display.bag?.currentTime || '--:--'} {/* Placeholder */}
              </div>
              <div className="text-xl sm:text-2xl opacity-80">{display.label}</div>
            </div>
          ) : (
            // Active workout state
            <div>
              <div className="text-6xl sm:text-8xl font-bold mb-4 tracking-wider"> {/* Responsive text */}
                {display.primary.toString()}
              </div>
              <div className="text-2xl sm:text-3xl">{display.label}</div>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="absolute bottom-4 right-4 flex items-center bg-gray-800 px-2 py-1 rounded"> {/* Styled indicator */}
          <div
            className={`w-3 h-3 rounded-full mr-2 animate-pulse ${ // Added pulse
              receiverState === 'RUNNING' ? 'bg-green-500' :
              receiverState === 'PAUSED' ? 'bg-yellow-500' : 'bg-gray-500'
            }`}
          />
          <span className="text-sm opacity-80">
            {receiverState} {/* Simplified state name */}
          </span>
        </div>

        {/* wod-wiki branding */}
        <div className="absolute top-4 left-4 text-sm opacity-60 font-semibold"> {/* Styled branding */}
          wod-wiki Receiver
        </div>
      </div>

       {/* Debug Panel Toggle Button */}
       <button
         onClick={() => setDebug(!debug)}
         className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded mb-2 self-start transition-colors duration-200"
       >
         {debug ? 'Hide' : 'Show'} Debug Log
       </button>

      {/* Debug panel */}
      {debug && (
        <div className="bg-gray-800 p-3 rounded-lg max-h-48 overflow-y-auto text-sm shadow-inner"> {/* Adjusted max-height */}
          <h3 className="font-bold mb-2 border-b border-gray-700 pb-1">Event History</h3>
          {eventHistory.length === 0 ? (
            <div className="text-gray-400 italic">No events received yet.</div>
          ) : (
            <ul className="space-y-1">
              {eventHistory.map((event, index) => (
                <li key={index} className="border-b border-gray-700 pb-1 last:border-b-0">
                  <span className="text-gray-400 mr-2">{event.time}</span>
                  <span className={`font-mono font-semibold ${
                    event.eventType.includes('RUNNING') ? 'text-green-400' :
                    event.eventType.includes('PAUSED') ? 'text-yellow-400' :
                    event.eventType.includes('IDLE') ? 'text-blue-400' :
                    'text-gray-300' // Default color
                  }`}>
                    {event.eventType}
                  </span>
                  <pre className="mt-1 text-gray-300 overflow-x-auto whitespace-pre-wrap break-words bg-gray-900 p-1 rounded text-xs"> {/* Styled pre */}
                    {event.data}
                  </pre>
                </li>
              )).reverse()} {/* Show newest events first */}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// Add global typings for the mock receiver interface
declare global {
  interface Window {
    __mockChromecastReceiver?: {
      processEvent: (event: ChromecastEvent) => void;
    };
  }
}

export default MockChromecastReceiver;
