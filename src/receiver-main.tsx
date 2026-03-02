import React, { useEffect, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';
import { RELAY_URL } from '@/services/cast/config';
import { TimerScreen } from '@/components/workbench/TrackPanel';
import { ScriptRuntimeProvider } from '@/runtime/context/RuntimeContext';
import { PanelSizeProvider } from '@/components/layout/panel-system/PanelSizeContext';
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

  // Mock Objects to satisfy TimerScreen props
  const mockExecution = useMemo(() => {
    if (!remoteState) return null;
    const isRunning = remoteState.workoutState === 'running';
    let elapsed = remoteState.totalElapsedMs || 0;
    if (isRunning) elapsed += (now - lastUpdate);

    return {
      status: remoteState.workoutState,
      elapsedTime: elapsed,
      stepCount: 0,
      startTime: Date.now() - elapsed,
      start: () => {},
      pause: () => {},
      stop: () => {},
      reset: () => {},
      next: () => {}
    };
  }, [remoteState, now, lastUpdate]);

  if (!remoteState) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/20 font-mono uppercase tracking-[0.5em]">
        <div className="animate-pulse">Wod.Wiki // {wsStatus}</div>
      </div>
    );
  }

  const primary = remoteState.timerStack?.[0] || {};

  return (
    <PanelSizeProvider>
      <div className="h-screen w-screen bg-background">
        <TimerScreen
          runtime={null} // We will use specific mocks if needed
          execution={mockExecution as any}
          selectedBlock={{ id: 'remote', label: primary.label }}
          activeSegmentIds={new Set()}
          activeStatementIds={new Set()}
          hoveredBlockKey={null}
          documentItems={[]}
          activeBlockId="remote"
          onBlockHover={() => {}}
          onBlockClick={() => {}}
          onSelectBlock={() => {}}
          onSetActiveBlockId={() => {}}
          onStart={() => {}}
          onPause={() => {}}
          onStop={() => {}}
          onNext={() => {}}
        />
        
        {/* Tiny connection indicator */}
        <div className="absolute bottom-2 left-2 opacity-10 text-[6px] font-mono uppercase">
          {wsStatus} // REMOTE_SYNC_ACTIVE
        </div>
      </div>
    </PanelSizeProvider>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<ReceiverApp />);
}
