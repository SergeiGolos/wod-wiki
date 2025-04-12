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
  }, []); // Run only once on mount

  const initializeCastApi = useCallback(() => {
    // Using the same approach as the working example
    if (!window.chrome || !window.chrome.cast) {
      console.log('Cast SDK not available yet.');
      return;
    }
    console.log('Cast SDK available.');

    const sessionRequest = new window.chrome.cast.SessionRequest(APPLICATION_ID);
    const apiConfig = new window.chrome.cast.ApiConfig(
      sessionRequest,
      (session) => {
        // Session listener - called when a session is created or joined
        console.log('New session', session);
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
            sessionObject: session
          });
        }
      },
      (availability) => {
        // Receiver availability listener
        console.log('Receiver availability:', availability);
        if (availability === window.chrome.cast.ReceiverAvailability.AVAILABLE) {
          setIsAvailable(true);
        } else {
          setIsAvailable(false);
        }
      }
    );

    window.chrome.cast.initialize(
      apiConfig,
      () => {
        console.log('Cast API initialized successfully.');
        // Initialize the Cast button after API is ready
        if (window.google && window.google.cast && window.google.cast.framework) {
          const castContext = window.google.cast.framework.CastContext.getInstance();
          castContext.setOptions({
            receiverApplicationId: APPLICATION_ID
          });
        }
      },
      (error) => console.error('Cast API initialization failed:', error)
    );
  }, []);

  const connect = useCallback(async () => {
    if (!window.chrome || !window.chrome.cast) {
      const errorMsg = 'Cast API not available or not initialized.';
      setError(new Error(errorMsg));
      throw new Error(errorMsg);
    }

    try {
      setIsConnecting(true); // Optimistically set connecting state
      setError(null);
      
      // Use the approach from the working example
      window.chrome.cast.requestSession(
        (session) => {
          console.log('Session started', session);
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
              sessionObject: session
            });
          }
        },
        (error) => {
          console.error('Error starting cast session:', error);
          setError(new Error(`Failed to request session: ${error.code || error.message}`));
          setIsConnecting(false);
          setIsConnected(false);
          setDeviceName(null);
        }
      );
    } catch (err: any) {
      console.error('Error requesting session:', err);
      const errorMsg = `Failed to request session: ${err.message || err.code}`; 
      setError(new Error(errorMsg));
      setIsConnecting(false); // Reset connecting state on error
      setIsConnected(false);
      setDeviceName(null);
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    const session = internalSession?.sessionObject;

    if (session) {
      try {
        setError(null);
        await session.endSession(true);
        // Reset the state
        setIsConnected(false);
        setDeviceName(null);
        setInternalSession(null);
      } catch (err: any) {
        console.error('Error ending session:', err);
        const errorMsg = `Failed to disconnect: ${err.message || err.code}`; 
        setError(new Error(errorMsg));
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
        // Use the same approach as the working example
        session.sendMessage(namespace || CAST_NAMESPACE, message,
          () => console.log('Message sent successfully'),
          (error) => {
            console.error('Failed to send message:', error);
            throw new Error(`Failed to send message: ${error.message || error.code}`);
          }
        );
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
        ReceiverAvailability?: {
          AVAILABLE: string;
          UNAVAILABLE: string;
        };
        SessionRequest?: any;
        ApiConfig?: any;
        initialize?: (apiConfig: any, onSuccess: () => void, onError: (error: any) => void) => void;
        requestSession?: (
          onSuccess: (session: CastSession) => void,
          onError: (error: any) => void
        ) => void;
        // ErrorCode might be needed for Promises, keep minimal types
        ErrorCode?: any;
      };
    };
    google?: {
      cast?: {
        framework?: any;
      };
    };
    __onGCastApiAvailable?: (isAvailable: boolean, reason?: string) => void;
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
      message: any,
      onSuccess?: () => void,
      onError?: (error: any) => void
    ) => void;
    endSession: (stopCasting: boolean) => Promise<chrome.cast.ErrorCode | undefined>;
  }

  interface CastDevice {
    id: string;
    friendlyName: string;
  }
}