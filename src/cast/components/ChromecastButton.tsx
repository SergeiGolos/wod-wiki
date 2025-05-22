import React, { useEffect, useState } from 'react'; // Added useState
import { UseCastSenderResult } from '../hooks/useCastSender';

// Make all props from UseCastSenderResult available
export const ChromecastButton: React.FC<UseCastSenderResult> = (props) => {  
  const { 
    state$, 
    connect, 
    disconnect, 
    sendStartClock, 
    sendStopClock, 
    sendResetClock 
  } = props;
  const [state, setState] = useState(state$.getValue());
  
  useEffect(() => {
    const sub = state$.subscribe(setState);
    return () => sub.unsubscribe();
  }, [state$]);

  const handleClick = async () => {
    try {
      if (state.isConnecting) return;
      if (state.isConnected) {
        await disconnect();
        // Disconnected from Chromecast
        return;
      }
      await connect();
      // Connecting to Chromecast...
    } catch (error) {
      console.error('[ChromecastButton] Chromecast operation failed:', error);
    }
  }

  const getButtonStyle = () => {
    const baseStyle = "flex items-center px-3 py-1 rounded-full transition-all border "; // Removed border-blue-200 for individual styling
    if (state.isConnected) {
      return baseStyle + "bg-blue-600 text-white hover:bg-blue-700 shadow-lg border-blue-500";
    }
    if (state.isConnecting) {
      return baseStyle + "bg-blue-400 text-white animate-pulse border-blue-300";
    }
    if (!state.isAvailable) {
      return baseStyle + "bg-gray-200 text-gray-400 opacity-50 border-gray-300"; // Adjusted for disabled look
    }
    return baseStyle + "bg-white text-gray-800 hover:bg-gray-50 border-gray-300";
  };

  const controlButtonBaseStyle = "px-3 py-1 rounded-md text-sm font-medium transition-colors ";
  const activeControlButtonstyle = controlButtonBaseStyle + "bg-green-500 hover:bg-green-600 text-white border border-green-700";
  const disabledControlButtonstyle = controlButtonBaseStyle + "bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-400";


  return (
    <div className="flex flex-col space-y-2 items-start"> {/* Changed to flex-col and items-start */}
      <div className="flex items-center space-x-2"> {/* Group for connect and control buttons */}
        <button
          className={getButtonStyle()}
          onClick={handleClick}
          disabled={!state.isAvailable || state.isConnecting}
          aria-label={state.isConnected ? 'Disconnect Chromecast' : 'Connect Chromecast'}
        >
          <div className="w-4 h-4 mr-1"> {/* SVG remains the same */}
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
          <span>{state.isConnected ? (state.deviceName || 'Disconnect') : 'Connect'}</span>
        </button>

        {/* New Control Buttons */}
        {state.isConnected && sendStartClock && sendStopClock && sendResetClock && (
          <div className="flex items-center space-x-2 ml-2">
            <button
              onClick={() => sendStartClock()}
              className={activeControlButtonstyle}
              aria-label="Start Clock"
            >
              Start
            </button>
            <button
              onClick={() => sendStopClock()}
              className={activeControlButtonstyle.replace("bg-green-500 hover:bg-green-600 border-green-700", "bg-red-500 hover:bg-red-600 border-red-700")} // Quick style change for Stop
              aria-label="Stop Clock"
            >
              Stop
            </button>
            <button
              onClick={() => sendResetClock()}
              className={activeControlButtonstyle.replace("bg-green-500 hover:bg-green-600 border-green-700", "bg-yellow-500 hover:bg-yellow-600 border-yellow-700")} // Quick style change for Reset
              aria-label="Reset Clock"
            >
              Reset
            </button>
          </div>
        )}
      </div>
      {/* Display device name when connected */}
      {state.isConnected && state.deviceName && (
        <div className="text-xs text-gray-600 mt-1">
          Connected to: {state.deviceName}
        </div>
      )}
    </div>
  );
};
