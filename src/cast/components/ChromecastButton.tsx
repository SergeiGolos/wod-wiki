import React, { useEffect } from 'react';
import { useChromecast } from '../hooks/useChromecast';
import { RuntimeEvent } from '@/core/timer.types';
import { ChromecastEvent, ChromecastEventType } from '../types/chromecast-events';
import { CAST_NAMESPACE } from '../types/chromecast-events';

interface ChromecastButtonProps {
  onStatusChange?: (isConnected: ((event : ChromecastEvent) => void)) => void;
  setEvents?: React.Dispatch<React.SetStateAction<RuntimeEvent[]>>;
}

export const ChromecastButton: React.FC<ChromecastButtonProps> = ({ 
  onStatusChange,
  setEvents 
}) => {
  const {
    isAvailable,
    isConnected,
    isConnecting,
    deviceName,
    error,
    connect,
    disconnect,
    sendMessage  
  } = useChromecast();

  // Notify parent component when connection status changes
  useEffect(() => {
    if (onStatusChange) {
      if (isConnected) {
        onStatusChange((event) => sendMessage(CAST_NAMESPACE, event));
      }else{
        onStatusChange(() => sendMessage(CAST_NAMESPACE, { eventType: ChromecastEventType.SET_IDLE, timestamp: new Date() }));
      }
    }
    
    // When connected, add to events if setEvents is provided
    sendMessage(CAST_NAMESPACE, { eventType: ChromecastEventType.SET_IDLE, timestamp: new Date() });
  }, [isConnected, onStatusChange, setEvents]);

  // Handle button click
  const handleClick = async () => {
    try {
      // If already connecting, do nothing
      if (isConnecting) return;
      // If already connected, disconnect
      if (isConnected) {
        await disconnect();
        return;
      }
      
      // If not connected, initiate the cast
      await connect();
      // Status change is handled by the effect hook
    } catch (error) {
      console.error('Chromecast operation failed:', error);
    }
  };

  // Determine button style based on status
  const getButtonStyle = () => {
    const baseStyle = "flex items-center px-3 py-1 rounded-full transition-all border border-blue-200 ";
    
    if (isConnected) {
      // Blue background when connected
      return baseStyle + "bg-blue-600 text-white hover:bg-blue-700 shadow-lg";
    }
    
    if (isConnecting) {
      // Pulsing effect when connecting
      return baseStyle + "bg-blue-400 text-white animate-pulse";
    }
    
    if (!isAvailable) {
      // Gray when not available (disabled)
      return baseStyle + "bg-white text-gray-400 opacity-50";
    }
    
    // Normal button with black text when available but not connected
    return baseStyle + "bg-white text-gray-800 hover:bg-gray-50";
  };

  // Status text for title/tooltip
  const getStatusText = () => {
    if (error) return `Error: ${error.message}`;
    if (isConnected) return `Connected to ${deviceName || 'Chromecast device'}`;
    if (isConnecting) return 'Connecting...';
    if (isAvailable) return 'Cast to device';
    return 'Chromecast not available';
  };

  return (
    <div className="flex items-center">
      <button
        onClick={handleClick}
        disabled={!isAvailable || isConnecting}
        className={getButtonStyle()}
        title={getStatusText()}
      >
        <div className="w-4 h-4 mr-1">
          <svg viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
            <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
              <g id="ic_cast_black_24dp">
                <g id="ic_remove_circle_white_24dp">
                  <path d="M1,18 L1,21 L4,21 C4,19.34 2.66,18 1,18 L1,18 Z M1,14 L1,16 C3.76,16 6,18.24 6,21 L8,21 C8,17.13 4.87,14 1,14 L1,14 Z M1,10 L1,12 C5.97,12 10,16.03 10,21 L12,21 C12,14.92 7.07,10 1,10 L1,10 Z M21,3 L3,3 C1.9,3 1,3.9 1,5 L1,8 L3,8 L3,5 L21,5 L21,19 L14,19 L14,21 L21,21 C22.1,21 23,20.1 23,19 L23,5 C23,3.9 22.1,3 21,3 L21,3 Z" id="cast" fill="currentColor"></path>
                  <rect id="bounds" x="0" y="0" width="24" height="24"></rect>
                </g>
              </g>
            </g>
          </svg>
        </div>       
      </button>
    </div>
  );
};
