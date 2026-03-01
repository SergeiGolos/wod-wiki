import React, { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWorkbenchSyncStore } from '@/components/layout/workbenchSyncStore';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { RELAY_URL } from '@/services/cast/config';

export const TVPage: React.FC = () => {
  const [remoteState, setRemoteState] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 1. WebSocket Synchronization (for remote devices like Chromecast)
  useEffect(() => {
    let retryTimeout: any;
    const deviceId = 'tv-' + uuidv4().substring(0, 8);
    
    const connect = () => {
      console.log('[TVPage] Attempting connection to:', RELAY_URL);
      const ws = new WebSocket(RELAY_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[TVPage] Connected to relay');
        setWsStatus('connected');
        setErrorInfo(null);
        
        const sendRegistration = () => {
          const registration = {
            type: 'register',
            messageId: uuidv4(),
            timestamp: Date.now(),
            payload: {
              clientType: 'receiver',
              clientId: deviceId,
              clientName: 'Web TV',
              capabilities: { heartRateMonitor: false, multiUser: false, features: [] },
              protocolVersion: '1.0.0'
            }
          };
          ws.send(JSON.stringify(registration));
        };

        sendRegistration();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'cast-request') {
            ws.send(JSON.stringify({
              type: 'cast-accepted',
              messageId: uuidv4(),
              sessionId: msg.payload.sessionId,
              timestamp: Date.now(),
              payload: { ready: true, users: [] }
            }));
          } else if (msg.type === 'state-update') {
            setRemoteState({
              display: {
                primaryTimer: msg.payload.displayState.timerStack[0],
                isRunning: msg.payload.displayState.workoutState === 'running'
              },
              execution: {
                elapsedTime: msg.payload.displayState.totalElapsedMs
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onerror = (e) => {
        console.error('[TVPage] WS Error:', e);
        setWsStatus('error');
        setErrorInfo(`Cannot reach relay at ${RELAY_URL}`);
        retryTimeout = setTimeout(connect, 2000);
      };

      ws.onclose = () => {
        setWsStatus('connecting');
        retryTimeout = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  // 2. BroadcastChannel Fallback (for same-browser casting)
  useEffect(() => {
    const channel = new BroadcastChannel('wod-wiki-cast');
    channel.onmessage = (event) => {
      if (event.data.type === 'STATE_UPDATE') {
        setRemoteState(event.data.payload);
      }
    };
    return () => channel.close();
  }, []);

  const display = remoteState?.display || { isRunning: false };
  const execution = remoteState?.execution || { elapsedTime: 0 };
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      {isLocalhost && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/80 backdrop-blur-md text-white p-4 rounded-lg z-50 text-center animate-pulse">
          <p className="font-bold text-sm">⚠️ RUNNING ON LOCALHOST</p>
          <p className="text-[10px] opacity-90">Chromecast cannot connect to localhost. Use your Tailscale IP.</p>
        </div>
      )}

      {errorInfo && (
        <div className="absolute top-20 left-4 right-4 bg-orange-500/80 backdrop-blur-md text-white p-4 rounded-lg z-50 text-center">
          <p className="font-bold text-sm">📡 CONNECTION ERROR</p>
          <p className="text-[10px] font-mono">{errorInfo}</p>
        </div>
      )}
      
      {/* Connection Debug Info */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 z-40 opacity-50">
        <div className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[8px] font-mono text-white/50">
          RELAY: {RELAY_URL}
        </div>
        <div className={`text-[8px] font-mono px-2 py-0.5 rounded self-start ${wsStatus === 'connected' ? 'bg-emerald-500 text-emerald-100' : 'bg-red-500 text-red-100'}`}>
          STATUS: {wsStatus.toUpperCase()}
        </div>
      </div>

      <div className="w-full h-full">
        <TimerStackView
          elapsedMs={execution.elapsedTime}
          hasActiveBlock={!!display.primaryTimer}
          onStart={() => {}}
          onPause={() => {}}
          onStop={() => {}}
          onNext={() => {}}
          isRunning={display.isRunning}
          primaryTimer={display.primaryTimer}
          secondaryTimers={display.secondaryTimers}
          subLabel={display.subLabel}
        />
      </div>
      
      <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-20 text-white text-[8px] font-mono uppercase tracking-widest">
        <div className={`w-1 h-1 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
        WOD.WIKI // TV RECEIVER
      </div>
    </div>
  );
};
