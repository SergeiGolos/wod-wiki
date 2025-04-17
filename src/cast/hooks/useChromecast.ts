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
const APPLICATION_ID = "38F01E0E"; // Custom Receiver App ID
const CAST_NAMESPACE = "urn:x-cast:com.google.cast.cac"; // Custom namespace matching the working example


/**
 * Loads the Chromecast sender script and resolves when the API is available.
 */
function loadCastApiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.chrome && window.chrome.cast) {
      resolve();
      return;
    }
    // If script is already loading, wait for it
    if (document.querySelector('script[src*="cast_sender.js"]')) {
      const checkInterval = setInterval(() => {
        if (window.chrome && window.chrome.cast) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Cast API script load timed out'));
      }, 10000);
      return;
    }
    // Otherwise, add the script
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    script.onload = () => {
      const checkInterval = setInterval(() => {
        if (window.chrome && window.chrome.cast) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Cast API script load timed out'));
      }, 10000);
    };
    script.onerror = () => reject(new Error('Failed to load Cast API script'));
    document.head.appendChild(script);
  });
}

/**
 * Result interface for the useChromecast hook
 */
interface UseChromecastResult {
  isAvailable: boolean;      // Cast API loaded?
  isConnected: boolean;      // Currently connected to a device?
  isConnecting: boolean;     // Connection in progress?
  deviceName: string | null; // Name of the connected device
  error: Error | null;       // Any error that occurred
  connect: () => Promise<void>;  // Connect to a Chromecast device
  disconnect: () => Promise<void>; // Disconnect from the device
  sendMessage: (namespace: string, message: unknown) => Promise<void>; // Send a message to the device
}

/**
 * A React hook for interacting with Chromecast devices 
 * using the ChromecastSender service
 * 
 * @returns {UseChromecastResult} Object containing Chromecast state and control functions
 */
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
    window['__onGCastApiAvailable'] = (isApiAvailable: boolean, reason?: string) => {
      console.log('Cast API available:', isApiAvailable, reason || '');
      if (isApiAvailable && window.chrome && window.chrome.cast) {
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
        console.error('Google Cast SDK could not be loaded.');
      }
    };

    if (!document.querySelector('script[src*="cast_sender.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.head.appendChild(script);
    } else if (window.chrome && window.chrome.cast && window.chrome.cast.isAvailable) {
      // If the Cast API is already available, initialize it directly
      initializeCastApi();
    }

    return () => {
      window['__onGCastApiAvailable'] = undefined;
    };
  }, []);

  // Initialize Cast API and set up listeners
  const initializeCastApi = useCallback(() => {
    if (!window.chrome || !window.chrome.cast || !window.chrome.cast.isAvailable) {
      setIsAvailable(false);
      return;
    }
    if (!window.cast || !window.cast.framework || !window.cast.framework.CastContext) {
      setIsAvailable(false);
      return;
    }
    const context = window.cast.framework.CastContext.getInstance();
    context.setOptions({
      receiverApplicationId: APPLICATION_ID,
      autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED
    });
    // Listen for cast state changes
    context.addEventListener(window.cast.framework.CastContextEventType.CAST_STATE_CHANGED, (event: any) => {
      const castState = event.castState;
      if (castState === window.cast.framework.CastState.CONNECTED) {
        setIsConnected(true);
        setIsConnecting(false);
        const session = context.getCurrentSession();
        if (session) {
          setDeviceName(session.getCastDevice().friendlyName);
          setInternalSession({
            sessionId: session.getSessionId(),
            deviceId: session.getCastDevice().id,
            deviceName: session.getCastDevice().friendlyName,
            statusText: session.getStatusText() || '',
            sessionObject: session
          });
        }
      } else if (castState === window.cast.framework.CastState.CONNECTING) {
        setIsConnecting(true);
        setIsConnected(false);
      } else {
        setIsConnected(false);
        setIsConnecting(false);
        setDeviceName(null);
        setInternalSession(null);
      }
    });
    setIsAvailable(true);
  }, []);

  // Connect to a Chromecast device
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      if (!window.cast || !window.cast.framework || !window.cast.framework.CastContext) {
        throw new Error('Cast Framework not available');
      }
      const context = window.cast.framework.CastContext.getInstance();
      await context.requestSession();
      // State will be updated by event listener
    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err : new Error('Unknown error connecting to Chromecast'));
      throw err;
    }
  }, []);

  // Disconnect from the current Chromecast device
  const disconnect = useCallback(async () => {
    try {
      if (!window.cast || !window.cast.framework || !window.cast.framework.CastContext) {
        throw new Error('Cast Framework not available');
      }
      const context = window.cast.framework.CastContext.getInstance();
      const session = context.getCurrentSession();
      if (session) {
        await session.endSession(true);
      }
      setIsConnected(false);
      setIsConnecting(false);
      setDeviceName(null);
      setInternalSession(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error disconnecting from Chromecast'));
      throw err;
    }
  }, []);

  // Send a message to the connected Chromecast device
  const sendMessage = useCallback(async (namespace: string, message: unknown) => {
    try {
      if (!internalSession || !internalSession.sessionObject) {
        throw new Error('Not connected to a Chromecast device');
      }
      await new Promise<void>((resolve, reject) => {
        internalSession.sessionObject!.sendMessage(namespace, message, resolve, reject);
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error sending message to Chromecast'));
      throw err;
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
    sendMessage
  };
}