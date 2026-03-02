import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';
import { RELAY_URL } from '@/services/cast/config';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { PanelSizeProvider } from '@/components/layout/panel-system/PanelSizeContext';
import { FragmentSourceRow } from '@/components/fragments/FragmentSourceRow';
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

  const timerStack = remoteState.timerStack || [];
  const primary = timerStack.find((t: any) => t.role === 'primary') || timerStack[0];
  const isRunning = remoteState.workoutState === 'running';
  
  // High-fidelity local timer calculation
  let elapsed = remoteState.totalElapsedMs || 0;
  if (isRunning) elapsed += (now - lastUpdate);

  return (
    <PanelSizeProvider>
      <div className="h-screen w-screen bg-background text-foreground flex overflow-hidden">
        {/* Left Column: Authentic Stack View */}
        <div className="flex-1 min-w-0 bg-secondary/5 border-r border-border p-16 flex flex-col overflow-hidden">
           <div className="opacity-20 text-[10px] font-bold tracking-[0.5em] uppercase mb-12">Workout Protocol</div>
           
           <div className="flex-1 flex flex-col gap-8">
              {remoteState.displayRows?.map((entry: any, i: number) => (
                <div key={i} className={`transition-all duration-500 ${entry.isLeaf ? 'scale-110 translate-x-4' : 'opacity-40'}`} style={{ paddingLeft: `${entry.depth * 2}rem` }}>
                   <div className="text-sm font-bold uppercase tracking-widest text-blue-500 mb-2">{entry.label}</div>
                   {entry.rows.map((row: any, j: number) => (
                      <div key={j} className="text-4xl font-black uppercase">
                         <FragmentSourceRow fragments={row} />
                      </div>
                   ))}
                </div>
              ))}
           </div>
        </div>

        {/* Right Column: Big Clock */}
        <div className="w-[45%] flex flex-col justify-center bg-black relative">
          <TimerStackView
            elapsedMs={elapsed}
            hasActiveBlock={!!primary}
            onStart={() => {}} onPause={() => {}} onStop={() => {}} onNext={() => {}}
            isRunning={isRunning}
            primaryTimer={primary}
            secondaryTimers={timerStack.filter((t: any) => t !== primary)}
          />
          
          <div className="absolute bottom-4 right-4 opacity-10 text-[8px] font-mono tracking-tighter uppercase">
            {wsStatus} // {remoteState.workoutState}
          </div>
        </div>
      </div>
    </PanelSizeProvider>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<ReceiverApp />);
}
