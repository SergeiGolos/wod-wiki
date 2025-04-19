import React, { useEffect, useState, useCallback } from 'react';
import { CAST_NAMESPACE, ChromecastEventType, ChromecastEvent } from './types/chromecast-events';
import { TimerFromSeconds } from '@/core/timer.types';
import { WodTimer } from '@/components/clock/WodTimer';

export const CastReceiver: React.FC = () => {
  const [timerState, setTimerState] = useState<{ isRunning: boolean; startTime: number; elapsed: number }>({
    isRunning: false,
    startTime: 0,
    elapsed: 0,
  });
  const [display, setDisplay] = useState<{ primary: TimerFromSeconds; label: string; bag: { totalTime: TimerFromSeconds } }>({
    primary: new TimerFromSeconds(0),
    label: 'Timer',
    bag: { totalTime: new TimerFromSeconds(0) },
  });
  const [receivedMessages, setReceivedMessages] = useState<{ time: string; message: string }[]>([]);
  const [debug, setDebug] = useState(false);

  // Handler for Chromecast events
  const handleEvent = useCallback((event: ChromecastEvent) => {
    setReceivedMessages(prev => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        message: `${event.eventType}: ${JSON.stringify(event.bag)}`,
      },
    ].slice(-5)); // Keep last 5 messages

    switch (event.eventType) {
      case ChromecastEventType.SET_DISPLAY:
        setDisplay({
          primary: event.bag.spans ? event.bag.spans[0] : new TimerFromSeconds(0),
          label: 'Timer',
          bag: { totalTime: event.bag.totalTime ? event.bag.totalTime : new TimerFromSeconds(0) },
        });
        break;
      case ChromecastEventType.SET_SOUND:
      case ChromecastEventType.SET_DEBUG:
      case ChromecastEventType.SET_ERROR:
      case ChromecastEventType.HEARTBEAT:
      case ChromecastEventType.SET_IDLE:
        // Handle other event types as needed
        break;
      default:
        setReceivedMessages(prev => [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            message: `Unknown event type: ${event.eventType}`,
          },
        ].slice(-5));
        break;
    }
  }, []);

  // Initialize ChromeCast receiver
  useEffect(() => {
    setReceivedMessages(prev => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        message: 'Initializing Chromecast receiver',
      },
    ]);
    
    const initializeReceiver = () => {
      const context = (window as any).cast?.framework?.CastReceiverContext.getInstance();
      if (!context) {
        setReceivedMessages(prev => [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            message: 'ERROR: Cast Receiver Context not available',
          },
        ]);
        return;
      }
      context.addCustomMessageListener(CAST_NAMESPACE, (event: any) => {
        setReceivedMessages(prev => [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            message: `MESSAGE: ${JSON.stringify(event.data)}`,
          },
        ].slice(-5));
        if (event.data && event.data.eventType) {
          handleEvent(event.data as ChromecastEvent);
        }
      });
      context.start();
    };

    if ((window as any).cast && (window as any).cast.framework) {
      initializeReceiver();
    } else {
      (window as any).__onGCastApiAvailable = function(isAvailable: boolean) {
        if (isAvailable) {
          initializeReceiver();
        }
      };
    }
  }, [handleEvent]);


  return (
    <div className="bg-gray-200 text-black h-screen w-screen">      
      <div className="timer-container mb-6">
        <WodTimer display={display} />
      </div>      
      {/* Debug info - useful during development */}
      {debug && <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-lg font-medium mb-2">Receiver Debug Info</h2>
        <div className="text-xs text-gray-400">
          <div className="mb-2">Status: {timerState.isRunning ? 'Running' : 'Stopped'}</div>
          {receivedMessages.length > 0 ? (
            <div className="border border-gray-700 rounded p-2">
              <h3 className="text-xs mb-1">Last Messages:</h3>
              {receivedMessages.map((msg, i) => (
                <div key={i} className="mb-1 pb-1 border-b border-gray-700 last:border-0">
                  <span className="text-gray-500">[{msg.time}]</span> {msg.message}
                </div>
              ))}
            </div>
          ) : (
            <div>No messages received yet</div>
          )}
        </div>
      </div>}
    </div>
  );
};

// Add global type definitions for Cast Receiver API
declare global {
  interface Window {
    cast?: {
      framework?: {
        CastReceiverContext: {
          getInstance: () => CastReceiverInstance;
        };
      };
    };
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
  }
  
  interface CastReceiverInstance {
    addCustomMessageListener: (namespace: string, listener: (event: CustomMessageEvent) => void) => void;
    start: (options?: CastReceiverOptions) => void;
    stop: () => void;
  }
  
  interface CastReceiverOptions {
    disableIdleTimeout?: boolean;
    customNamespaces?: Record<string, string>;
  }
  
  interface CustomMessageEvent {
    data: any;
    senderId: string;
  }
}
