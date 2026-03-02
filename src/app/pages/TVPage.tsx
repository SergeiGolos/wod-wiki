import React, { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { RELAY_URL } from '@/services/cast/config';

export const TVPage: React.FC = () => {
  const [remoteState, setRemoteState] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [lastMsgTime, setLastMsgTime] = useState(0);
  const [now, setNow] = useState(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  // Keep 'now' updated for UI pulse logic
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 1. Get Session ID from either query string or hash
    const search = window.location.search || window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(search);
    const sessionId = params.get('session');
    const deviceId = 'tv-' + uuidv4().substring(0, 4);

    const connect = () => {
      const ws = new WebSocket(RELAY_URL);
      wsRef.current = ws;

      const remoteLog = (msg: any) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'log', messageId: uuidv4(), timestamp: Date.now(), payload: msg }));
        }
      };

      ws.onopen = () => {
        setWsStatus('connected');
        console.log('[TV] Connected to Relay. Room:', sessionId);
        remoteLog(`TV Connected to room: ${sessionId || 'none'}`);
        ws.send(JSON.stringify({
          type: 'register',
          messageId: uuidv4(),
          sessionId: sessionId || undefined,
          timestamp: Date.now(),
          payload: { 
            clientType: 'receiver', 
            clientId: deviceId,
            url: window.location.href // Debug info
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          setLastMsgTime(Date.now());
          
          if (msg.type === 'state-update' || msg.type === 'cast-request') {
            const data = msg.payload.displayState || msg.payload.workout?.initialState;
            if (data) {
              setRemoteState({
                display: {
                  primaryTimer: data.timerStack?.[0],
                  isRunning: data.workoutState === 'running'
                },
                execution: { elapsedTime: data.totalElapsedMs || 0 }
              });
            }
          }
        } catch (e) {
          console.error('[TV] Parse error:', e);
        }
      };

      ws.onclose = () => {
        setWsStatus('connecting');
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  const display = remoteState?.display || { isRunning: false };
  const execution = remoteState?.execution || { elapsedTime: 0 };

  if (!remoteState) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/40">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-white/5 rounded-full animate-pulse flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500' : 'bg-orange-500 animate-ping'}`} />
          </div>
        </div>
        <div className="mt-8 text-xs font-mono uppercase tracking-[0.2em] animate-pulse">
          Waiting for Session...
        </div>
        <div className="mt-4 text-[8px] font-mono opacity-50">
          {RELAY_URL} // {wsStatus.toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center">
      {/* Tiny Debug Info */}
      <div className="absolute top-2 right-2 flex gap-2 items-center opacity-30">
        <div className={`w-1.5 h-1.5 rounded-full ${now - lastMsgTime < 2000 ? 'bg-blue-500 animate-ping' : 'bg-gray-500'}`} />
        <div className="text-[8px] font-mono text-white uppercase">{wsStatus}</div>
      </div>

      <div className="w-full h-full">
        <TimerStackView
          elapsedMs={execution.elapsedTime}
          hasActiveBlock={!!display.primaryTimer}
          onStart={() => {}} onPause={() => {}} onStop={() => {}} onNext={() => {}}
          isRunning={display.isRunning}
          primaryTimer={display.primaryTimer}
          secondaryTimers={[]}
        />
      </div>
    </div>
  );
};
