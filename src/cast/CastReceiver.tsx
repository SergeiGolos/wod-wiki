import React, { useEffect, useCallback, useState } from 'react';
import { WodTimer } from '@/components/clock/WodTimer';
import { TimerDisplayBag, TimerFromSeconds } from '@/core/timer.types';

// Custom message namespace - must match the sender
const CAST_NAMESPACE = "urn:x-cast:com.google.cast.cac";

interface Event {
  id: string;
  type: 'START' | 'STOP' | 'RESET' | 'INITIALIZATION' | 'TEST_MESSAGE';
  timestamp: number;
  payload: any;
}

interface TimerState {
  isRunning: boolean;
  startTime: number;
  elapsed: number;
}

const CastReceiver: React.FC = () => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: 0,
    elapsed: 0
  });
  
  const [display, setDisplay] = useState<TimerDisplayBag>({
    primary: new TimerFromSeconds(0),
    label: 'Timer',
    bag: { totalTime: new TimerFromSeconds(0) }
  });

  // Debug state to display received messages
  const [receivedMessages, setReceivedMessages] = useState<Array<{
    time: string;
    message: string;
  }>>([]);

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
    
    // Log message for debugging
    const now = new Date();
    setReceivedMessages(prev => [
      ...prev, 
      { 
        time: now.toLocaleTimeString(), 
        message: `${event.type}: ${JSON.stringify(event.payload)}` 
      }
    ].slice(-5)); // Keep last 5 messages

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
        
      case 'TEST_MESSAGE':
        // Just log test messages, no action needed
        console.log('Test message received:', event.payload);
        break;
    }
  }, []);

  // Initialize ChromeCast receiver
  useEffect(() => {
    console.log('Initializing ChromeCast receiver app');
    
    // Log initialization for debugging
    setReceivedMessages(prev => [
      ...prev, 
      { 
        time: new Date().toLocaleTimeString(), 
        message: 'Initializing Chromecast receiver' 
      }
    ]);
    
    const initializeReceiver = () => {
      const context = window.cast?.framework?.CastReceiverContext.getInstance();
      if (!context) {
        console.error('Cast Receiver Context not available');
        setReceivedMessages(prev => [
          ...prev, 
          { 
            time: new Date().toLocaleTimeString(), 
            message: 'ERROR: Cast Receiver Context not available' 
          }
        ]);
        return;
      }

      // Set up custom messaging with the namespace format from the working example
      context.addCustomMessageListener(CAST_NAMESPACE, (event) => {
        console.log('Received message on namespace:', CAST_NAMESPACE, event.data);
        
        // Log raw message for debugging
        const now = new Date();
        setReceivedMessages(prev => [
          ...prev, 
          { 
            time: now.toLocaleTimeString(), 
            message: `MESSAGE: ${JSON.stringify(event.data)}` 
          }
        ].slice(-5)); // Keep last 5 messages
        
        if (event.data.type) {
          // Handle as a timer control message
          handleEvent({
            id: crypto.randomUUID(),
            type: event.data.type as any,
            timestamp: Date.now(),
            payload: event.data
          });
        }
      });

      // Start the receiver with custom options for better compatibility
      context.start({
        disableIdleTimeout: true,
        customNamespaces: {
          [CAST_NAMESPACE]: 'JSON'
        }
      });
      
      // Log successful initialization
      console.log('Cast receiver initialized successfully');
      setReceivedMessages(prev => [
        ...prev, 
        { 
          time: new Date().toLocaleTimeString(), 
          message: 'Cast receiver initialized successfully' 
        }
      ]);
    };

    // Check if the Cast API is already available
    if (window.cast && window.cast.framework) {
      initializeReceiver();
    } else {
      // The cast_receiver_framework.js script may still be loading
      // Set up a listener for when it becomes available
      window.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable) {
          initializeReceiver();
        } else {
          console.error('Cast Receiver API not available');
          setReceivedMessages(prev => [
            ...prev, 
            { 
              time: new Date().toLocaleTimeString(), 
              message: 'ERROR: Cast Receiver API not available' 
            }
          ]);
        }
      };
    }

    // Trigger initialization event
    handleEvent({
      id: crypto.randomUUID(),
      type: 'INITIALIZATION',
      timestamp: Date.now(),
      payload: { message: 'ChromeCast receiver initialized' }
    });
    
    return () => {
      // Clean up
      const context = window.cast?.framework?.CastReceiverContext.getInstance();
      if (context) {
        context.stop();
      }
    };
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
      
      {/* Debug info - useful during development */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
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

export default CastReceiver;
