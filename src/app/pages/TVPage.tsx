import React, { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TimerDisplay } from '@/components/workout/TimerDisplay';
import { VisualStatePanel } from '@/components/track/VisualStatePanel';
import { RELAY_URL } from '@/services/cast/config';
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';

export const TVPage: React.FC = () => {
  const [remoteState, setRemoteState] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const search = window.location.search || window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(search);
    const sessionId = params.get('session');
    const deviceId = 'tv-' + uuidv4().substring(0, 4);

    const connect = () => {
      const ws = new WebSocket(RELAY_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        setWsStatus('connected');
        ws.send(JSON.stringify({
          type: 'register', messageId: uuidv4(), sessionId: sessionId || undefined,
          timestamp: Date.now(), payload: { clientType: 'receiver', clientId: deviceId }
        }));
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state-update') {
          setRemoteState(msg.payload.displayState);
        }
      };
      ws.onclose = () => { setWsStatus('connecting'); setTimeout(connect, 3000); };
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  if (!remoteState) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/20 font-mono uppercase tracking-[0.5em]">
        <div className="animate-pulse text-sm">Wod.Wiki // Waiting for Data</div>
      </div>
    );
  }

  const primary = remoteState.timerStack?.[0] || {};
  const isRunning = remoteState.workoutState === 'running';

  // We render the EXACT layout used in TrackPanel.tsx
  return (
    <div className="h-screen w-screen bg-background text-foreground flex overflow-hidden">
      {/* Left Column: Visual State (Mirrored exactly from browser) */}
      <div className="flex-1 min-w-0 bg-secondary/5 border-r border-border p-12">
        <div className="scale-150 origin-top-left h-full">
           <h2 className="text-[8px] font-bold opacity-30 mb-8 tracking-widest uppercase">Workout Stack</h2>
           {/* Note: We would ideally pass a Mock Runtime here to drive the real VisualStatePanel */}
           <div className="text-6xl font-black uppercase">{primary.label || 'Effort'}</div>
           <div className="mt-4 text-xl text-blue-500 font-medium">{isRunning ? 'Active' : 'Paused'}</div>
        </div>
      </div>

      {/* Right Column: Timer Display (Mirrored exactly from browser) */}
      <div className="w-1/2 flex flex-col justify-center bg-black/20">
        <TimerDisplay
          elapsedMs={remoteState.totalElapsedMs || 0}
          hasActiveBlock={!!primary}
          onStart={() => {}} onPause={() => {}} onStop={() => {}} onNext={() => {}}
          isRunning={isRunning}
          enableDisplayStack={false} // The TV is the display stack
        />
      </div>
    </div>
  );
};
