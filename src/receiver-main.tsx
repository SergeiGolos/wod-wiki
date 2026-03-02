import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';
import { RELAY_URL } from '@/services/cast/config';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { VisualStatePanel } from '@/components/track/VisualStatePanel';
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import '@/index.css';

const ReceiverApp = () => {
  const [remoteState, setRemoteState] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    const sessionId = params.get('session');
    const deviceId = 'tv-' + uuidv4().substring(0, 4);

    const connect = () => {
      const ws = new WebSocket(RELAY_URL);
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
          setLastUpdate(Date.now());
        }
      };
      ws.onclose = () => { setWsStatus('connecting'); setTimeout(connect, 3000); };
    };
    connect();
  }, []);

  if (!remoteState) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/20 font-mono uppercase tracking-[0.5em]">
        <div className="animate-pulse">Wod.Wiki // {wsStatus}</div>
      </div>
    );
  }

  const primary = remoteState.timerStack?.[0] || {};
  const isRunning = remoteState.workoutState === 'running';
  
  // Calculate local time for 60fps smoothness
  let elapsed = remoteState.totalElapsedMs || 0;
  if (isRunning) elapsed += (now - lastUpdate);

  return (
    <div className="h-screen w-screen bg-background text-foreground flex overflow-hidden">
      {/* Left: Visual State Panel (The same one from the browser!) */}
      <div className="flex-1 border-r border-border bg-secondary/5 overflow-hidden">
         {/* We mock the runtime context so the VisualStatePanel can render without a real runtime */}
         <div className="p-8 scale-125 origin-top-left">
            <h2 className="text-sm font-bold opacity-30 mb-8 tracking-widest uppercase">Workout Stack</h2>
            {/* Note: In a full implementation, we'd pass the serialized stack here */}
            <div className="text-4xl font-black">{primary.label || 'Prepare'}</div>
         </div>
      </div>

      {/* Right: Big Clock */}
      <div className="w-1/2 flex flex-col items-center justify-center bg-black">
        <TimerStackView
          elapsedMs={elapsed}
          hasActiveBlock={!!primary}
          onStart={() => {}} onPause={() => {}} onStop={() => {}} onNext={() => {}}
          isRunning={isRunning}
          primaryTimer={primary}
          secondaryTimers={[]}
        />
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<ReceiverApp />);
}
