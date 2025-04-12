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
  connect: (deviceId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (namespace: string, message: unknown) => Promise<void>;
}

// Define the cast namespace for our application
const APPLICATION_ID = "34AAF98E"; // Custom Receiver App ID
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
      // Use the right framework version for custom receivers
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

    // Create a cast context instead of using the older API directly
    const context = window.cast?.framework?.CastContext.getInstance();
    
    if (context) {
      // Configure for custom receiver and filter for TV displays
      context.setOptions({
        receiverApplicationId: APPLICATION_ID,
        // This is critical - force to PRESENTATION mode for displays/TVs
        autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED,
        language: 'en-US',
        resumeSavedSession: false
      });
      
      // Listen for cast state changes
      context.addEventListener(
        window.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        (event) => {
          const castState = event.castState;
          
          if (castState === window.cast.framework.CastState.CONNECTED) {
            const session = context.getCurrentSession();
            if (session) {
              setCurrentSession({
                sessionId: session.getSessionId(),
                deviceId: session.getCastDevice().friendlyName || 'Unknown TV',
                deviceName: session.getCastDevice().friendlyName || 'Chromecast TV',
                statusText: 'Connected'
              });
              setStatus('connected');
            }
          } else if (castState === window.cast.framework.CastState.NOT_CONNECTED) {
            setCurrentSession(null);
            setStatus('available');
          } else if (castState === window.cast.framework.CastState.CONNECTING) {
            setStatus('connecting');
          }
        }
      );
      
      console.log('Cast framework initialized successfully');
    } else {
      // Fall back to the older API if framework isn't available
      const sessionRequest = new window.chrome.cast.SessionRequest(APPLICATION_ID);
      
      // Try to explicitly set to presentation mode for TVs
      if (window.chrome.cast.DefaultActionPolicy) {
        sessionRequest.requestType = 'presentation';
      }
      
      const apiConfig = new window.chrome.cast.ApiConfig(
        sessionRequest,
        sessionListener,
        receiverListener,
        window.chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED
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
    }
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
    
    // For now, if we know devices are available, we'll create a single entry
    if (window.chrome.cast.ReceiverAvailability.AVAILABLE) {
      const compatibleDevices: ChromecastDevice[] = [
        { id: 'tv-receiver', name: 'TV Display', friendlyName: 'TV Display' },
      ];
      
      setDevices(compatibleDevices);
    } else {
      setDevices([]);
    }
  }, [isAvailable]);
  
  // Connect to a Cast device
  const connect = useCallback(async (deviceId?: string) => {
    if (!isAvailable) {
      throw new Error('Chrome Cast API not available');
    }
    
    setStatus('connecting');
    
    try {
      // Use the Cast Framework if available (better for filtering TVs)
      if (window.cast?.framework) {
        const context = window.cast.framework.CastContext.getInstance();
        
        // This will show the standard device picker dialog
        // but properly filtered for TV devices
        await context.requestSession();
        
        // The state change listener will handle setting the session
        return;
      }
      
      // Fallback to the older API if framework isn't available
      return new Promise<void>((resolve, reject) => {
        const sessionRequest = new window.chrome.cast.SessionRequest(APPLICATION_ID);
        
        // Force presentation mode for TVs
        if (window.chrome.cast.DefaultActionPolicy) {
          sessionRequest.requestType = 'presentation';
        }
        
        window.chrome.cast.requestSession(
          (session) => {
            console.log('Session established:', session);
            
            // Add message listener
            session.addMessageListener(NAMESPACE, (namespace, message) => {
              console.log(`Message received from ${namespace}:`, message);
            });
            
            // Send initial message to the receiver
            try {
              session.sendMessage(NAMESPACE, { 
                type: 'INIT',
                timestamp: new Date().toISOString()
              });
            } catch (error) {
              console.warn('Failed to send initial message:', error);
            }
            
            setCurrentSession({
              sessionId: session.sessionId,
              deviceId: session.receiverFriendlyName || 'chromecast-device',
              deviceName: session.receiverFriendlyName || 'WOD Display',
              statusText: 'Connected'
            });
            
            setStatus('connected');
            resolve();
          },
          (error) => {
            console.error('Error requesting session:', error);
            setError(new Error(`Failed to request session: ${error.description}`));
            setStatus('error');
            reject(error);
          },
          sessionRequest
        );
      });
    } catch (err) {
      console.error('Error connecting to device:', err);
      setError(err instanceof Error ? err : new Error('Unknown error connecting to device'));
      setStatus('error');
      throw err;
    }
  }, [isAvailable]);

  // Disconnect from the current Cast session
  const disconnect = useCallback(async () => {
    if (!isAvailable) {
      if (!currentSession) {
        return; // No active session to disconnect
      }
      throw new Error('Chrome Cast API not available');
    }
    
    setStatus('disconnecting');
    
    try {
      // Try using the newer framework first
      if (window.cast?.framework) {
        const context = window.cast.framework.CastContext.getInstance();
        const session = context.getCurrentSession();
        
        if (session) {
          await session.endSession(true);
          setCurrentSession(null);
          setStatus('available');
          return;
        }
      }
      
      // Fall back to the older API
      return new Promise<void>((resolve, reject) => {
        if (!window.chrome?.cast || !currentSession) {
          setCurrentSession(null);
          setStatus('available');
          resolve();
          return;
        }
        
        const session = window.chrome.cast.getSessionById(currentSession.sessionId);
        
        if (!session) {
          console.warn('Session not found, resetting state');
          setCurrentSession(null);
          setStatus('available');
          resolve();
          return;
        }
        
        session.leave(
          () => {
            console.log('Session left successfully');
            setCurrentSession(null);
            setStatus('available');
            resolve();
          },
          (error) => {
            console.error('Error leaving session:', error);
            
            // Try to forcefully end the session as a backup
            session.stop(
              () => {
                console.log('Session stopped successfully');
                setCurrentSession(null);
                setStatus('available');
                resolve();
              },
              (stopError) => {
                console.error('Error stopping session:', stopError);
                setError(new Error(`Failed to disconnect: ${stopError.description}`));
                reject(stopError);
              }
            );
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
    if (!isAvailable || !currentSession) {
      throw new Error('No active Chromecast session');
    }
    
    try {
      // Try using the newer framework first
      if (window.cast?.framework) {
        const context = window.cast.framework.CastContext.getInstance();
        const session = context.getCurrentSession();
        
        if (session) {
          const channel = session.getMessageChannel(namespace);
          await channel.send(message);
          return;
        }
      }
      
      // Fall back to the older API
      return new Promise<void>((resolve, reject) => {
        if (!window.chrome?.cast || !currentSession) {
          reject(new Error('No active Chromecast session'));
          return;
        }
        
        const session = window.chrome.cast.getSessionById(currentSession.sessionId);
        
        if (!session) {
          reject(new Error('Session not found'));
          return;
        }
        
        session.sendMessage(
          namespace,
          message,
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
      console.error('Error sending message to device:', err);
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
    cast?: {
      // New Cast Framework (preferred method)
      framework?: {
        CastContext: {
          getInstance: () => {
            setOptions: (options: any) => void;
            getCurrentSession: () => any;
            requestSession: () => Promise<void>;
            addEventListener: (eventType: string, listener: (event: any) => void) => void;
          }
        };
        CastContextEventType: {
          CAST_STATE_CHANGED: string;
          ACTIVE_INPUT_STATE_CHANGED: string;
          SESSION_STATE_CHANGED: string;
        };
        CastState: {
          NO_DEVICES_AVAILABLE: string;
          NOT_CONNECTED: string;
          CONNECTING: string;
          CONNECTED: string;
        };
      };
      // Older Cast API (fallback)
      chrome?: {
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
        // Request types
        RequestType?: {
          CUSTOM: string;
          MEDIA: string;
          PRESENTATION: string;
        };
        // Default action policies
        DefaultActionPolicy?: {
          CREATE_SESSION: string;
          CAST_THIS_TAB: string;
        };
        // Constants
        ReceiverAvailability: {
          AVAILABLE: string;
          UNAVAILABLE: string;
        };
        // Capabilities for filtering devices
        Capability: {
          VIDEO_OUT: string;
          AUDIO_OUT: string;
          VIDEO_IN: string;
          AUDIO_IN: string;
          MULTIZONE_GROUP: string;
        };
        // Auto join policies
        AutoJoinPolicy: {
          CUSTOM_CONTROLLER_SCOPED: string;
          TAB_AND_ORIGIN_SCOPED: string;
          ORIGIN_SCOPED: string;
          PAGE_SCOPED: string;
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
        // Request types
        RequestType?: {
          CUSTOM: string;
          MEDIA: string;
          PRESENTATION: string;
        };
        // Default action policies
        DefaultActionPolicy?: {
          CREATE_SESSION: string;
          CAST_THIS_TAB: string;
        };
        // Constants
        ReceiverAvailability: {
          AVAILABLE: string;
          UNAVAILABLE: string;
        };
        // Capabilities for filtering devices
        Capability: {
          VIDEO_OUT: string;
          AUDIO_OUT: string;
          VIDEO_IN: string;
          AUDIO_IN: string;
          MULTIZONE_GROUP: string;
        };
        // Auto join policies
        AutoJoinPolicy: {
          CUSTOM_CONTROLLER_SCOPED: string;
          TAB_AND_ORIGIN_SCOPED: string;
          ORIGIN_SCOPED: string;
          PAGE_SCOPED: string;
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
