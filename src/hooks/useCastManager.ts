// src/hooks/useCastManager.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { CastManager } from '@/services/cast/CastManager';
import { TargetDiscoveredMessage } from '@/types/cast/messages';

// Use environment variable or default to local server
const RELAY_SERVER_URL = import.meta.env?.VITE_RELAY_SERVER_URL || 'ws://localhost:8080';

export interface CastTarget {
    targetId: string;
    name: string;
    type: 'android-tv' | 'web-receiver';
    capabilities: any;
    inSession: boolean;
}

export interface CastSession {
    sessionId: string;
    targetId: string;
    startTime: number;
}

export function useCastManager() {
  const [isConnected, setIsConnected] = useState(false);
  const [availableReceivers, setAvailableReceivers] = useState<CastTarget[]>([]);
  const [activeSession, setActiveSession] = useState<CastSession | null>(null);
  const managerRef = useRef<CastManager | null>(null);

  useEffect(() => {
    const manager = new CastManager();
    managerRef.current = manager;

    manager.on('connectionOpened', () => setIsConnected(true));
    manager.on('connectionClosed', () => setIsConnected(false));
    manager.on('targetDiscovered', (target: CastTarget) => {
      setAvailableReceivers(prev => {
          if (prev.find(t => t.targetId === target.targetId)) {
              return prev;
          }
          return [...prev, target];
      });
    });

    manager.on('castAccepted', (message: any) => {
        // We need to know which request this is for, or we assume it's for the pending one.
        // For simplicity, we trust the flow for now.
        // Ideally CastManager keeps track of pending requests.
    });

    manager.on('castStop', () => {
        setActiveSession(null);
    });

    // Connect on mount
    manager.connect(RELAY_SERVER_URL).catch(console.error);

    // Handle page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        manager.disconnect();
      } else {
        manager.connect(RELAY_SERVER_URL).catch(console.error);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      manager.disconnect();
    };
  }, []);

  const startCast = useCallback((targetId: string, workoutScript: string) => {
      if (managerRef.current) {
          const sessionId = managerRef.current.startCast(targetId, workoutScript);
          setActiveSession({
              sessionId,
              targetId,
              startTime: Date.now()
          });
          return sessionId;
      }
      return null;
  }, []);

  const stopCast = useCallback(() => {
      if (managerRef.current && activeSession) {
          managerRef.current.stopCast(activeSession.sessionId);
          setActiveSession(null);
      }
  }, [activeSession]);

  const sendStateUpdate = useCallback((displayState: any, sequenceNumber: number) => {
      if (managerRef.current && activeSession) {
          managerRef.current.sendStateUpdate(activeSession.sessionId, displayState, sequenceNumber);
      }
  }, [activeSession]);

  return {
    isConnected,
    availableReceivers,
    activeSession,
    startCast,
    stopCast,
    sendStateUpdate,
    discoverTargets: () => managerRef.current?.discoverTargets()
  };
}
