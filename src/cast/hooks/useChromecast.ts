import { useState, useEffect, useCallback } from 'react';

// Define types for our hook
export interface ChromecastDevice {
  id: string;
  name: string;
  friendlyName?: string;
}

export type ChromecastStatus = 
  | 'unavailable' // Chrome Cast API not available
  | 'available'   // API available but not connected
  | 'connecting'  // Currently connecting to a device
  | 'connected'   // Connected to a device
  | 'disconnecting' // Currently disconnecting from a device
  | 'error';      // Error state

export interface ChromecastSession {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  statusText: string;
}

export interface UseChromecastResult {
  isAvailable: boolean;
  devices: ChromecastDevice[];
  currentSession: ChromecastSession | null;
  status: ChromecastStatus;
  error: Error | null;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (namespace: string, message: unknown) => Promise<void>;
}

// Define the cast namespace for our application
const APPLICATION_ID = '4F8B3483'; // Default Media Receiver - replace with your own if registered
const NAMESPACE = 'urn:x-cast:com.wod.wiki';

/**
 * Hook for working with Chrome Cast client APIs
 * 
 * @returns {UseChromecastResult} Object containing Cast devices, status, and control functions
 */
export function useChromecast(): UseChromecastResult {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [status, setStatus] = useState<ChromecastStatus>('unavailable');
  const [devices, setDevices] = useState<ChromecastDevice[]>([]);
  const [currentSession, setCurrentSession] = useState<ChromecastSession | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [apiInitialized, setApiInitialized] = useState<boolean>(false);

  // Initialize the Chrome Cast API
  useEffect(() => {
    // Define the initialization callback
    window['__onGCastApiAvailable'] = (isAvailable: boolean) => {
      setIsAvailable(isAvailable);
      
      if (isAvailable) {
        try {
          initializeCastApi();
          setStatus('available');
          setApiInitialized(true);
        } catch (err) {
          console.error('Error initializing Cast API:', err);
          setError(err instanceof Error ? err : new Error('Unknown error initializing Cast API'));
          setStatus('error');
        }
      }
    };

    // Load the Cast API script if not already loaded
    if (!document.querySelector('script[src*="cast_sender.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.head.appendChild(script);
    }

    // Cleanup function to remove script and callback
    return () => {
      window['__onGCastApiAvailable'] = undefined;
    };
  }, []);

  // Initialize the Cast API when available
  const initializeCastApi = useCallback(() => {
    if (!window.chrome || !window.chrome.cast) {
      throw new Error('Chrome Cast API not available');
    }

    const sessionRequest = new window.chrome.cast.SessionRequest(APPLICATION_ID);
    
    const apiConfig = new window.chrome.cast.ApiConfig(
      sessionRequest,
      sessionListener,
      receiverListener
    );
    
    window.chrome.cast.initialize(
      apiConfig,
      () => {
        console.log('Cast API initialized successfully');
      },
      (error) => {
        console.error('Cast API initialization error:', error);
        setError(new Error(`Cast initialization failed: ${error.description}`));
        setStatus('error');
      }
    );
  }, []);

  // Session listener for when a session is established or recovered
  const sessionListener = useCallback((session) => {
    console.log('New session:', session);
    
    setCurrentSession({
      sessionId: session.sessionId,
      deviceId: session.receiverFriendlyName || 'Unknown device',
      deviceName: session.receiverFriendlyName || 'Unknown device',
      statusText: 'Connected'
    });
    
    setStatus('connected');
    
    // Add message listener
    session.addMessageListener(NAMESPACE, (namespace, message) => {
      console.log(`Message received from ${namespace}:`, message);
    });
    
    // Add update listener to track session changes
    session.addUpdateListener((isAlive) => {
      if (!isAlive) {
        setCurrentSession(null);
        setStatus('available');
      }
    });
  }, []);

  // Receiver listener to discover available devices
  const receiverListener = useCallback((availability) => {
    if (availability === window.chrome.cast.ReceiverAvailability.AVAILABLE) {
      // This doesn't provide the actual device list yet, just indicates devices are available
      console.log('Cast devices are available');
      
      // We need to request device list separately
      requestDeviceList();
    } else {
      console.log('No cast devices available');
      setDevices([]);
    }
  }, []);

  // Request the list of available Cast devices
  const requestDeviceList = useCallback(() => {
    if (!isAvailable || !window.chrome?.cast) return;
    
    // Unfortunately, the Cast API doesn't directly provide a list of available devices
    // We would need to use the Media Router API to get the device list, but it requires permissions
    // This is a known limitation - we can only know if devices are available in general, not specifics
    
    // For demo purposes, we'll simulate device discovery
    // In a production app, you'd need to use the Chrome extension API with proper permissions
    
    // Simulated devices for demonstration
    const simulatedDevices: ChromecastDevice[] = [
      { id: 'device1', name: 'Living Room TV', friendlyName: 'Living Room TV' },
      { id: 'device2', name: 'Bedroom Chromecast', friendlyName: 'Bedroom' },
    ];
    
    setDevices(simulatedDevices);
  }, [isAvailable]);
  
  // Periodically check for available devices when the API is initialized
  useEffect(() => {
    if (!apiInitialized) return;
    
    const intervalId = setInterval(requestDeviceList, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [apiInitialized, requestDeviceList]);

  // Connect to a Cast device
  const connect = useCallback(async (deviceId: string) => {
    if (!isAvailable || !window.chrome?.cast) {
      throw new Error('Chrome Cast API not available');
    }
    
    // Find the selected device in our list
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    
    setStatus('connecting');
    
    try {
      return new Promise<void>((resolve, reject) => {
        window.chrome.cast.requestSession(
          (session) => {
            console.log('Session established:', session);
            
            setCurrentSession({
              sessionId: session.sessionId,
              deviceId: device.id,
              deviceName: device.name,
              statusText: 'Connected'
            });
            
            setStatus('connected');
            resolve();
            
            // Set up the session message listener
            session.addMessageListener(NAMESPACE, (namespace, message) => {
              console.log(`Message received from ${namespace}:`, message);
            });
          },
          (error) => {
            console.error('Error requesting session:', error);
            setError(new Error(`Failed to request session: ${error.description}`));
            setStatus('error');
            reject(error);
          }
        );
      });
    } catch (err) {
      console.error('Error connecting to device:', err);
      setError(err instanceof Error ? err : new Error('Unknown error connecting to device'));
      setStatus('error');
      throw err;
    }
  }, [isAvailable, devices]);
  
  // Disconnect from the current Cast session
  const disconnect = useCallback(async () => {
    if (!isAvailable || !window.chrome?.cast || !currentSession) {
      if (!currentSession) {
        return; // No active session to disconnect
      }
      throw new Error('Chrome Cast API not available');
    }
    
    setStatus('disconnecting');
    
    try {
      return new Promise<void>((resolve, reject) => {
        const session = window.chrome.cast.getSessionById(currentSession.sessionId);
        
        if (!session) {
          setCurrentSession(null);
          setStatus('available');
          resolve();
          return;
        }
        
        session.leave(
          () => {
            console.log('Session ended successfully');
            setCurrentSession(null);
            setStatus('available');
            resolve();
          },
          (error) => {
            console.error('Error ending session:', error);
            setError(new Error(`Failed to end session: ${error.description}`));
            setStatus('error');
            reject(error);
          }
        );
      });
    } catch (err) {
      console.error('Error disconnecting from device:', err);
      setError(err instanceof Error ? err : new Error('Unknown error disconnecting from device'));
      setStatus('error');
      throw err;
    }
  }, [isAvailable, currentSession]);
  
  // Send a message to the connected Cast receiver
  const sendMessage = useCallback(async (namespace: string = NAMESPACE, message: unknown) => {
    if (!isAvailable || !window.chrome?.cast || !currentSession) {
      throw new Error('No active Chromecast session');
    }
    
    try {
      return new Promise<void>((resolve, reject) => {
        const session = window.chrome.cast.getSessionById(currentSession.sessionId);
        
        if (!session) {
          reject(new Error('Session not found'));
          return;
        }
        
        session.sendMessage(
          namespace,
          typeof message === 'string' ? message : JSON.stringify(message),
          () => {
            console.log('Message sent successfully');
            resolve();
          },
          (error) => {
            console.error('Error sending message:', error);
            reject(new Error(`Failed to send message: ${error.description}`));
          }
        );
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err : new Error('Unknown error sending message'));
      throw err;
    }
  }, [isAvailable, currentSession]);

  return {
    isAvailable,
    devices,
    currentSession,
    status,
    error,
    connect,
    disconnect,
    sendMessage
  };
}

// Add type definitions for the Chrome Cast API
declare global {
  interface Window {
    chrome?: {
      cast?: {
        // Basic initialization
        initialize: (
          apiConfig: any,
          onInitSuccess: () => void,
          onError: (error: any) => void
        ) => void;
        // Session management
        requestSession: (
          onSuccess: (session: any) => void,
          onError: (error: any) => void,
          sessionRequest?: any
        ) => void;
        SessionRequest: new (appId: string) => any;
        ApiConfig: new (
          sessionRequest: any,
          sessionListener: (session: any) => void,
          receiverListener: (availability: string) => void,
          autoJoinPolicy?: string,
          defaultActionPolicy?: string
        ) => any;
        // Session retrieval
        getSessionById: (sessionId: string) => any;
        // Constants
        ReceiverAvailability: {
          AVAILABLE: string;
          UNAVAILABLE: string;
        };
        // Error handling
        Error: {
          CANCEL: string;
          TIMEOUT: string;
          API_NOT_INITIALIZED: string;
          INVALID_PARAMETER: string;
          EXTENSION_MISSING: string;
          EXTENSION_NOT_COMPATIBLE: string;
          INVALID_ACTION: string;
          AUTHENTICATION_EXPIRED: string;
          RECEIVER_UNAVAILABLE: string;
          SESSION_ERROR: string;
          CHANNEL_ERROR: string;
          LOAD_MEDIA_FAILED: string;
        };
      };
    };
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
  }
}
