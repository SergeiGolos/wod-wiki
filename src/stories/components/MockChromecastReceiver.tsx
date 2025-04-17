/**
 * MockChromecastReceiver Component
 * 
 * This component provides a visual representation of how the Chromecast receiver
 * would display workout information, without requiring an actual Chromecast device.
 * It implements the same event protocol as the real receiver for testing.
 */

import React, { useState, useEffect } from 'react';
import { 
  ChromecastEvent, 
  ChromecastEventType,
  isClockRunningEvent,
  isClockPausedEvent,
  isClockIdleEvent
} from '../../cast/types/chromecast-events';
import { TimerDisplayBag, TimerFromSeconds } from '@/core/timer.types';

interface MockChromecastReceiverProps {
  visible: boolean;
  onClose?: () => void;
  debug?: boolean;
}

/**
 * Mock implementation of a Chromecast receiver for local testing
 */
const MockChromecastReceiver: React.FC<MockChromecastReceiverProps> = ({ 
  visible, 
  onClose, 
  debug = false 
}) => {
  // Display state
  const [display, setDisplay] = useState<TimerDisplayBag>({
    primary: new TimerFromSeconds(0),
    label: 'Idle',
    bag: { totalTime: new TimerFromSeconds(0) }
  });
  
  // Current state
  const [receiverState, setReceiverState] = useState<'RUNNING' | 'PAUSED' | 'IDLE'>('IDLE');
  
  // Event history for debugging
  const [eventHistory, setEventHistory] = useState<{
    time: string;
    eventType: ChromecastEventType;
    data: string;
  }[]>([]);

  /**
   * Process an incoming event
   */
  const processEvent = (event: ChromecastEvent) => {
    if (debug) {
      const now = new Date().toLocaleTimeString();
      setEventHistory(prev => [
        {
          time: now,
          eventType: event.eventType,
          data: JSON.stringify(event.data, null, 2)
        },
        ...prev.slice(0, 9) // Keep last 10 events
      ]);
    }

    // Handle different event types
    if (isClockRunningEvent(event)) {
      const { timerValue, timerDisplay, effort, roundCurrent, roundTotal, repetitions } = event.data;
      
      // Create label with workout information
      let label = effort;
      if (repetitions) {
        label += ` - ${repetitions} reps`;
      }
      if (roundTotal) {
        label += ` (Round ${roundCurrent}/${roundTotal})`;
      } else {
        label += ` (Round ${roundCurrent})`;
      }

      setDisplay({
        primary: new TimerFromSeconds(timerValue),
        label,
        bag: { totalTime: new TimerFromSeconds(timerValue) }
      });
      
      setReceiverState('RUNNING');
    } 
    else if (isClockPausedEvent(event)) {
      const { timerValue, timerDisplay, effort, roundCurrent, roundTotal, repetitions } = event.data;
      
      // Create label with workout information
      let label = `⏸️ ${effort}`;
      if (repetitions) {
        label += ` - ${repetitions} reps`;
      }
      if (roundTotal) {
        label += ` (Round ${roundCurrent}/${roundTotal})`;
      } else {
        label += ` (Round ${roundCurrent})`;
      }

      setDisplay({
        primary: new TimerFromSeconds(timerValue),
        label,
        bag: { totalTime: new TimerFromSeconds(timerValue) }
      });
      
      setReceiverState('PAUSED');
    }
    else if (isClockIdleEvent(event)) {
      const { currentTime, message } = event.data;
      
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
  };

  // Make the event processor available globally for testing
  useEffect(() => {
    if (visible) {
      // Add global access to event processor for testing
      window.__mockChromecastReceiver = {
        processEvent
      };

      // Set initial idle state
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setDisplay(prev => ({
        ...prev,
        label: 'Ready',
        bag: {
          ...prev.bag,
          currentTime
        }
      }));
    }

    return () => {
      // Clean up
      delete window.__mockChromecastReceiver;
    };
  }, [visible]);

  if (!visible) return null;

  // Main receiver UI
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-black text-white w-full max-w-2xl p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Mock Chromecast Receiver</h2>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* TV-like display with 16:9 aspect ratio */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {/* Main clock display */}
            <div className="text-center">
              {receiverState === 'IDLE' ? (
                // Idle state shows current time
                <div>
                  <div className="text-5xl font-bold mb-2">
                    {display.bag.currentTime || '00:00'}
                  </div>
                  <div className="text-xl opacity-80">{display.label}</div>
                </div>
              ) : (
                // Active workout state
                <div>
                  <div className="text-6xl font-bold mb-4">
                    {display.primary.toString()}
                  </div>
                  <div className="text-2xl">{display.label}</div>
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="absolute bottom-4 right-4 flex items-center">
              <div 
                className={`w-3 h-3 rounded-full mr-2 ${
                  receiverState === 'RUNNING' ? 'bg-green-500' : 
                  receiverState === 'PAUSED' ? 'bg-yellow-500' : 'bg-gray-500'
                }`}
              />
              <span className="text-sm opacity-80">
                {receiverState === 'RUNNING' ? 'Running' : 
                 receiverState === 'PAUSED' ? 'Paused' : 'Idle'}
              </span>
            </div>

            {/* wod-wiki branding */}
            <div className="absolute top-4 left-4 text-sm opacity-60">
              wod-wiki
            </div>
          </div>
        </div>

        {/* Debug panel */}
        {debug && (
          <div className="mt-4 bg-gray-800 p-3 rounded-lg max-h-40 overflow-y-auto">
            <h3 className="text-sm font-bold mb-2">Event History</h3>
            {eventHistory.length === 0 ? (
              <div className="text-sm text-gray-400">No events received yet</div>
            ) : (
              <ul className="text-xs space-y-1">
                {eventHistory.map((event, index) => (
                  <li key={index} className="border-b border-gray-700 pb-1">
                    <span className="text-gray-400">{event.time}</span> - 
                    <span className={`font-mono ml-1 ${
                      event.eventType.includes('RUNNING') ? 'text-green-400' : 
                      event.eventType.includes('PAUSED') ? 'text-yellow-400' : 
                      'text-blue-400'
                    }`}>
                      {event.eventType}
                    </span>
                    <pre className="mt-1 text-gray-300 overflow-x-auto">
                      {event.data}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Add global typings for the mock receiver
declare global {
  interface Window {
    __mockChromecastReceiver?: {
      processEvent: (event: ChromecastEvent) => void;
    };
  }
}

export default MockChromecastReceiver;
