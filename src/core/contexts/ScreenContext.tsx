"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ScreenService } from '../services/ScreenService';

interface ScreenContextProps {
  screenOnEnabled: boolean;
  toggleScreenOn: () => void;
  isScreenOnSupported: boolean;
  isScreenLocked: boolean;
  requestWakeLock: () => Promise<boolean>;
  releaseWakeLock: () => Promise<boolean>;
}

const ScreenContext = createContext<ScreenContextProps | undefined>(undefined);

export const useScreen = (): ScreenContextProps => {
  const context = useContext(ScreenContext);
  if (!context) {
    throw new Error('useScreen must be used within a ScreenProvider');
  }
  return context;
};

interface ScreenProviderProps {
  children: React.ReactNode;
}

export const ScreenProvider: React.FC<ScreenProviderProps> = ({ children }) => {
  const [screenOnEnabled, setScreenOnEnabled] = useState<boolean>(false);
  const [isScreenOnSupported, setIsScreenOnSupported] = useState<boolean>(false);
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);
  
  const screenService = React.useMemo(() => new ScreenService(), []);

  // Check if the Wake Lock API is supported
  useEffect(() => {
    const isSupported = screenService.isSupported();
    setIsScreenOnSupported(isSupported);
  }, [screenService]);

  // Handle visibility change events (e.g., when user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && screenOnEnabled && isScreenLocked) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [screenOnEnabled, isScreenLocked]);

  // Toggle screen on feature
  const toggleScreenOn = useCallback(() => {
    setScreenOnEnabled(prev => !prev);
  }, []);

  // Request wake lock
  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    if (!screenOnEnabled || !isScreenOnSupported) return false;
    
    const success = await screenService.requestWakeLock();
    setIsScreenLocked(success);
    return success;
  }, [screenOnEnabled, isScreenOnSupported, screenService]);

  // Release wake lock
  const releaseWakeLock = useCallback(async (): Promise<boolean> => {
    const success = await screenService.releaseWakeLock();
    if (success) {
      setIsScreenLocked(false);
    }
    return success;
  }, [screenService]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      screenService.releaseWakeLock().catch(console.error);
    };
  }, [screenService]);

  const value = {
    screenOnEnabled,
    toggleScreenOn,
    isScreenOnSupported,
    isScreenLocked,
    requestWakeLock,
    releaseWakeLock
  };

  return (
    <ScreenContext.Provider value={value}>
      {children}
    </ScreenContext.Provider>
  );
};
