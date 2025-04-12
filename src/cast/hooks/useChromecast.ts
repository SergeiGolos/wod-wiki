import { useState, useEffect, useCallback } from 'react';

// Internal type for session details (not exposed directly)
interface ChromecastSessionInternal {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  statusText: string;
  // Keep the internal session object reference for operations
  sessionObject: CastSession | null;
}

// Simplified result type exposed by the hook
interface UseChromecastResult {
  isAvailable: boolean;    // Cast API loaded?
  isConnected: boolean;    // Currently connected to a device?
  isConnecting: boolean;   // Connection in progress?
  deviceName: string | null; // Name of the connected device
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (namespace: string, message: unknown) => Promise<void>;
}

// Define the cast namespace for our application
const APPLICATION_ID = "34AAF98E"; // Custom Receiver App ID
const NAMESPACE = 'urn:x-cast:com.google.cast.cac';

// Hook for working with Chrome Cast client APIs using the modern framework
//
// @returns {UseChromecastResult} Object containing simplified Cast status and control functions
export function useChromecast(): UseChromecastResult {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  // Simplified state exposed to consumers
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  // Internal state to hold the session object for operations
  const [internalSession, setInternalSession] = useState<ChromecastSessionInternal | null>(null);

  // Initialize the Chrome Cast Framework API
  useEffect(() => {
    window['__onGCastApiAvailable'] = (isApiAvailable: boolean) => {
      if (isApiAvailable && window.cast?.framework) {
        try {
          initializeCastApi();
          setIsAvailable(true); // API script is loaded
        } catch (err) {
          console.error('Error initializing Cast API:', err);
          setError(err instanceof Error ? err : new Error('Unknown error initializing Cast API'));
          setIsAvailable(false);
          // Reset simplified state on init error
          setIsConnected(false);
          setIsConnecting(false);
          setDeviceName(null);
          setInternalSession(null);
        }
      } else {
        setIsAvailable(false);
        setIsConnected(false);
        setIsConnecting(false);
        setDeviceName(null);
        setInternalSession(null);
        if (!isApiAvailable) console.warn('Cast Sender API not available.');
        if (isApiAvailable && !window.cast?.framework) console.warn('Cast Framework not available on window.cast');
      }
    };

    if (!document.querySelector('script[src*="cast_sender.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      window['__onGCastApiAvailable'] = undefined;
    };
  }, []); // Run only once on mount

  const initializeCastApi = useCallback(() => {
    const context = window.cast.framework.CastContext.getInstance();
    if (!context) {
      throw new Error('Failed to get CastContext instance.');
    }

    context.setOptions({
      receiverApplicationId: APPLICATION_ID,
      autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED,
      language: 'en-US',
      resumeSavedSession: false
    });

    context.addEventListener(
      window.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      (event) => {
        const castState = event.castState;
        console.log('Cast State Changed:', castState); // Log state changes
        setError(null); // Clear previous errors on state change

        switch (castState) {
          case window.cast.framework.CastState.NO_DEVICES_AVAILABLE:
          case window.cast.framework.CastState.NOT_CONNECTED:
            setIsConnecting(false);
            setIsConnected(false);
            setDeviceName(null);
            setInternalSession(null);
            break;
          case window.cast.framework.CastState.CONNECTING:
            setIsConnecting(true);
            setIsConnected(false);
            setDeviceName(null);
            setInternalSession(null);
            break;
          case window.cast.framework.CastState.CONNECTED:
            const session = context.getCurrentSession();
            if (session) {
              const device = session.getCastDevice();
              const newDeviceName = device.friendlyName || 'Unknown Cast Device';
              setDeviceName(newDeviceName);
              setIsConnecting(false);
              setIsConnected(true);
              // Store session internally for operations
              setInternalSession({
                sessionId: session.getSessionId(),
                deviceId: device.id,
                deviceName: newDeviceName,
                statusText: session.getStatusText() || 'Connected',
                sessionObject: session // Keep the actual session object
              });

              // Add message listener (optional, only if receiver sends messages back)
              // session.addMessageListener(NAMESPACE, (namespace, message) => {
              //   console.log(`Message received from ${namespace}:`, message);
              // });
            } else {
              // Should not happen in CONNECTED state, but handle defensively
              setIsConnecting(false);
              setIsConnected(false);
              setDeviceName(null);
              setInternalSession(null);
            }
            break;
          default:
            // Handle unknown states if necessary
            break;
        }
      }
    );
    // Removed the explicit initial state check block
    console.log('Cast framework initialized successfully');
  }, []);

  const connect = useCallback(async () => {
    const context = window.cast?.framework?.CastContext.getInstance();
    if (!context || !isAvailable) {
      const errorMsg = 'Cast API not available or not initialized.';
      setError(new Error(errorMsg));
      throw new Error(errorMsg);
    }

    try {
      setIsConnecting(true); // Optimistically set connecting state
      setError(null);
      await context.requestSession();
      // State updates (isConnected, deviceName) handled by listener
    } catch (err: any) {
      console.error('Error requesting session:', err);
      const errorMsg = `Failed to request session: ${err.message || err.code}`; 
      setError(new Error(errorMsg));
      setIsConnecting(false); // Reset connecting state on error
      setIsConnected(false);
      setDeviceName(null);
      throw err;
    }
  }, [isAvailable]);

  const disconnect = useCallback(async () => {
    const session = internalSession?.sessionObject;

    if (session) {
      try {
        setError(null);
        await session.endSession(true);
        // State updates (isConnected=false, deviceName=null) handled by listener
      } catch (err: any) {
        console.error('Error ending session:', err);
        const errorMsg = `Failed to disconnect: ${err.message || err.code}`; 
        setError(new Error(errorMsg));
        // Reflect disconnect failure in state potentially? Or rely on listener?
        // For now, let listener handle state unless error persists.
        throw err;
      }
    } else {
      console.warn('Disconnect called but no active session found.');
    }
  }, [internalSession]);

  const sendMessage = useCallback(async (namespace: string, message: unknown) => {
    const session = internalSession?.sessionObject;

    if (session) {
      try {
        setError(null);
        await session.sendMessage(namespace, message);
      } catch (err: any) {
        console.error(`Error sending message to ${namespace}:`, err);
        const errorMsg = `Failed to send message: ${err.message || err.code}`;
        setError(new Error(errorMsg));
        throw err;
      }
    } else {
      const errMsg = 'Cannot send message: No active session.';
      console.error(errMsg);
      setError(new Error(errMsg));
      throw new Error(errMsg);
    }
  }, [internalSession]);

  return {
    isAvailable,
    isConnected,
    isConnecting,
    deviceName,
    error,
    connect,
    disconnect,
    sendMessage,
  };
}

// Keep the global type definitions as they are needed for framework interactions
declare global {
  interface Window {
    cast?: {
      framework?: {
        CastContext: {
          getInstance: () => CastContext;
        };
        CastContextEventType: {
          CAST_STATE_CHANGED: string;
        };
        CastState: {
          NO_DEVICES_AVAILABLE: string;
          NOT_CONNECTED: string;
          CONNECTING: string;
          CONNECTED: string;
        };
      };
    };
    chrome?: {
      cast?: {
        AutoJoinPolicy: {
          TAB_AND_ORIGIN_SCOPED: string;
        };
        // ErrorCode might be needed for Promises, keep minimal types
        ErrorCode?: any;
      };
    };
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
  }

  interface CastContext {
    setOptions: (options: CastOptions) => void;
    addEventListener: (
      eventType: string,
      listener: (event: CastStateEvent) => void
    ) => void;
    removeEventListener: (
      eventType: string,
      listener: (event: CastStateEvent) => void
    ) => void;
    getCurrentSession: () => CastSession | null;
    requestSession: () => Promise<chrome.cast.ErrorCode | undefined>;
    getCastState: () => string;
  }

  interface CastOptions {
    receiverApplicationId: string;
    autoJoinPolicy: string;
    language?: string;
    resumeSavedSession?: boolean;
  }

  interface CastStateEvent {
    castState: string;
  }

  interface CastSession {
    getSessionId: () => string;
    getCastDevice: () => CastDevice;
    getStatusText: () => string | null;
    addMessageListener: (
      namespace: string,
      listener: (namespace: string, message: string) => void
    ) => void;
    removeMessageListener: (
      namespace: string,
      listener: (namespace: string, message: string) => void
    ) => void;
    sendMessage: (
      namespace: string,
      message: any
    ) => Promise<void>; // Changed from ErrorCode to void based on framework docs
    endSession: (stopCasting: boolean) => Promise<chrome.cast.ErrorCode | undefined>;
  }

  interface CastDevice {
    id: string;
    friendlyName: string;
  }
}
