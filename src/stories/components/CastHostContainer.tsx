import React, { useEffect } from 'react';
import { CastReceiver } from '../../cast/CastReceiver';
import { WikiContainer } from '@/components/WikiContainer';
import { useLocalCast } from '@/cast/hooks/useLocalCast';
import { ChromecastButton } from '@/cast/components/ChromecastButton';
import { useScreen } from '@/contexts/ScreenContext';
import { useSound } from '@/contexts/SoundContext';
import { EyeIcon, EyeSlashIcon, SpeakerWaveIcon } from '@heroicons/react/20/solid';
import { SpeakerXMarkIcon } from '@heroicons/react/20/solid';

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


export const CastHostContainer: React.FC = () => {
  // Create a Subject to emit ChromecastEvents
  const cast = useLocalCast();
  const { soundEnabled, toggleSound } = useSound();
  const { screenOnEnabled, toggleScreenOn, requestWakeLock, releaseWakeLock } =
    useScreen();
// Monitor runtime state to control screen wake lock
useEffect(() => {
  const handleRuntimeStateChange = async () => {
    // const isIdle = runtimeRef.current?.current?.getState() === "idle";

    // if (screenOnEnabled) {
    //   if (!isIdle) {
    //     // Runtime is active, request wake lock
    //     await requestWakeLock();
    //   } else {
    //     // Runtime is idle, release wake lock
    //     await releaseWakeLock();
    //   }
    // }
  };

  // Initial check
  handleRuntimeStateChange();

  // Set up an interval to check for state changes
  const intervalId = setInterval(handleRuntimeStateChange, 1000);

  return () => {
    clearInterval(intervalId);
    releaseWakeLock();
  };
}, [screenOnEnabled, requestWakeLock, releaseWakeLock]);

    // Create sound toggle button
    const soundToggleButton = {
      icon: soundEnabled ? SpeakerWaveIcon : SpeakerXMarkIcon,
      onClick: () => {
        toggleSound();
        return [];
      },
      isActive: soundEnabled,
    };
  
    // Create screen on toggle button
    const screenOnToggleButton = {
      icon: screenOnEnabled ? EyeIcon : EyeSlashIcon,
      onClick: () => {
        toggleScreenOn();
        return [];
      },
      isActive: screenOnEnabled,
    };

  // Render CastReceiver and WikiContainer side by side
  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
      <div style={{ flex: 2, minWidth: 0, maxWidth: '57.6667%' }}>
        <CastReceiver event$={cast.event$} />
      </div>
      <div style={{ flex: 1, minWidth: 0, maxWidth: '42.3333%' }}>
        <WikiContainer id="wod-editor" code={'5:00 Testing (10)'} outbound={cast.sendMessage}>
        {soundToggleButton && (
            <button
              onClick={soundToggleButton.onClick}
              className={
                soundToggleButton.isActive
                  ? "bg-blue-100 text-blue-600 p-2 rounded-full"
                  : "text-gray-500 hover:bg-gray-100 p-2 rounded-full"
              }
            >
              <soundToggleButton.icon className="h-5 w-5" />
            </button>
          )}
          {screenOnToggleButton && (
            <button
              onClick={screenOnToggleButton.onClick}
              className={
                screenOnToggleButton.isActive
                  ? "bg-blue-100 text-blue-600 p-2 rounded-full"
                  : "text-gray-500 hover:bg-gray-100 p-2 rounded-full"
              }
            >
              <screenOnToggleButton.icon className="h-5 w-5" />
            </button>
          )}
          <ChromecastButton {...cast}/>
        </WikiContainer>
      </div>      
    </div>
  );
};
