import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';
import { RELAY_URL } from '@/services/cast/config';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { PanelSizeProvider } from '@/components/layout/panel-system/PanelSizeContext';
import { FragmentSourceRow } from '@/components/fragments/FragmentSourceRow';
import { cn } from '@/lib/utils';
import { formatTimeMMSS } from '@/lib/formatTime';
import { Timer, CheckCircle2, ListTree } from 'lucide-react';
import '@/index.css';

// ============================================================================
// Types for serialized display state from the WebSocket bridge
// ============================================================================

interface RemoteTimerEntry {
  id: string;
  ownerId: string;
  label: string;
  format: 'up' | 'down';
  durationMs?: number;
  role: 'primary' | 'secondary';
  accumulatedMs: number;
  isRunning: boolean;
  isPinned?: boolean;
}

interface RemoteDisplayRow {
  blockKey: string;
  blockType?: string;
  label: string;
  isLeaf: boolean;
  depth: number;
  rows: any[][]; // ICodeFragment[][]
  timer: {
    elapsed: number;
    durationMs?: number;
    direction: 'up' | 'down';
    isRunning: boolean;
  } | null;
}

interface RemoteState {
  timerStack: RemoteTimerEntry[];
  displayRows: RemoteDisplayRow[];
  lookahead: { fragments: any[] } | null;
  subLabel?: string;
  workoutState: string;
  totalElapsedMs: number;
}

// ============================================================================
// RemoteStackBlockItem — Mirrors StackBlockItem from VisualStateComponents
// ============================================================================

const RemoteStackBlockItem: React.FC<{
  entry: RemoteDisplayRow;
  localNow: number;
  lastUpdate: number;
  isRunning: boolean;
}> = ({ entry, localNow, lastUpdate, isRunning: workoutRunning }) => {
  const hasTimer = !!entry.timer;

  // Locally interpolate timer elapsed for smoother display  
  let elapsed = entry.timer?.elapsed ?? 0;
  if (entry.timer?.isRunning && workoutRunning) {
    elapsed += (localNow - lastUpdate);
  }

  return (
    <div
      className={cn(
        "relative w-full",
        entry.isLeaf ? "animate-in fade-in slide-in-from-left-1 duration-300" : ""
      )}
    >
      <div className={cn(
        "rounded-md border text-sm transition-all",
        entry.isLeaf
          ? "bg-card shadow-sm border-primary/40 ring-1 ring-primary/10"
          : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50"
      )}>
        {/* Block header row */}
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "font-semibold tracking-tight",
              entry.isLeaf ? "text-foreground" : "text-muted-foreground"
            )}>
              {entry.label}
            </span>
          </div>

          {hasTimer && (
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded font-mono text-xs font-bold shrink-0",
              entry.timer?.isRunning
                ? "bg-primary/10 text-primary animate-pulse"
                : "bg-muted text-muted-foreground"
            )}>
              <Timer className="h-3 w-3" />
              {formatTimeMMSS(elapsed)}
            </div>
          )}
        </div>

        {/* Fragment rows */}
        {entry.rows.length > 0 && (
          <div className="flex flex-col gap-0.5 px-3 pb-2">
            {entry.rows.map((row, rowIdx) => (
              <FragmentSourceRow
                key={rowIdx}
                fragments={row}
                size="compact"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// RemoteVisualStatePanel — Mirrors VisualStatePanel from track/
// ============================================================================

const RemoteVisualStatePanel: React.FC<{
  displayRows: RemoteDisplayRow[];
  lookahead: { fragments: any[] } | null;
  localNow: number;
  lastUpdate: number;
  isRunning: boolean;
}> = ({ displayRows, lookahead, localNow, lastUpdate, isRunning }) => {
  if (displayRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
        <ListTree className="h-8 w-8 mb-2 opacity-20" />
        <span className="text-sm">No Active Blocks</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
      {/* 1. Active Stack Context */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex flex-col gap-1 relative">
          {displayRows.map((entry, index) => (
            <RemoteStackBlockItem
              key={entry.blockKey || index}
              entry={entry}
              localNow={localNow}
              lastUpdate={lastUpdate}
              isRunning={isRunning}
            />
          ))}
        </div>
      </div>

      {/* 2. Up Next (Lookahead) */}
      <div className="shrink-0 bg-muted/30 border border-dashed rounded-lg">
        <div className="p-3 pb-0">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Up Next
          </h3>
        </div>
        <div className="p-3">
          {lookahead ? (
            <div className={cn(
              "rounded-md border text-sm transition-all",
              "bg-card/50 border-border/60 hover:bg-card/80"
            )}>
              <div className="flex flex-col gap-0.5 p-3">
                <FragmentSourceRow
                  fragments={lookahead.fragments}
                  size="compact"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm p-3 border border-dashed rounded-lg text-muted-foreground bg-muted/10">
              <CheckCircle2 className="h-4 w-4" />
              <span className="italic">End of section</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ReceiverApp — Main receiver matching Workbench Track layout
// ============================================================================

const ReceiverApp = () => {
  const [remoteState, setRemoteState] = useState<RemoteState | null>(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [dpadFlash, setDpadFlash] = useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);

  // Local clock for smooth timer interpolation
  useEffect(() => {
    let frameId: number;
    const tick = () => {
      setNow(Date.now());
      frameId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frameId);
  }, []);

  // WebSocket connection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    const sessionId = params.get('session');
    sessionIdRef.current = sessionId;
    const deviceId = 'tv-' + uuidv4().substring(0, 4);

    const connect = () => {
      const ws = new WebSocket(RELAY_URL);
      ws.onopen = () => {
        setWsStatus('connected');
        wsRef.current = ws;
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
      ws.onclose = () => { wsRef.current = null; setWsStatus('connecting'); setTimeout(connect, 3000); };
    };
    connect();
  }, []);

  // ── Send event back to caster via relay ──
  const sendReceiverEvent = React.useCallback((eventName: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'event-from-receiver',
      messageId: uuidv4(),
      sessionId: sessionIdRef.current || undefined,
      timestamp: Date.now(),
      payload: {
        event: {
          name: eventName,
          timestamp: Date.now()
        }
      }
    }));
  }, []);

  // ── D-Pad key handler + focus management for Chromecast remote ──
  useEffect(() => {
    // Ensure body can receive focus
    document.body.tabIndex = 0;
    document.body.focus();

    const refocus = () => setTimeout(() => document.body.focus(), 100);
    document.body.addEventListener('blur', refocus);

    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          sendReceiverEvent('next');
          setDpadFlash(true);
          setTimeout(() => setDpadFlash(false), 200);
          break;
        case 'ArrowUp':
          e.preventDefault();
          sendReceiverEvent('start');
          setDpadFlash(true);
          setTimeout(() => setDpadFlash(false), 200);
          break;
        case 'ArrowDown':
          e.preventDefault();
          sendReceiverEvent('pause');
          setDpadFlash(true);
          setTimeout(() => setDpadFlash(false), 200);
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          sendReceiverEvent('stop');
          setDpadFlash(true);
          setTimeout(() => setDpadFlash(false), 200);
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.removeEventListener('blur', refocus);
    };
  }, [sendReceiverEvent]);

  // ── Waiting screen ──
  if (!remoteState) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/20 font-mono uppercase tracking-[0.5em]">
        <div className="animate-pulse">Wod.Wiki // {wsStatus}</div>
      </div>
    );
  }

  // ── Derive timer props (mirrors StackIntegratedTimer logic) ──
  const timerStack = remoteState.timerStack || [];
  const primary = timerStack.find(t => t.role === 'primary') || timerStack[0];
  const secondaries = timerStack.filter(t => t !== primary);
  const isRunning = remoteState.workoutState === 'running';

  // Locally interpolate primary timer elapsed
  let primaryElapsed = primary?.accumulatedMs ?? 0;
  if (primary?.isRunning && isRunning) {
    primaryElapsed += (now - lastUpdate);
  }

  // Build timerStates map for TimerStackView 
  const timerStates = new Map<string, { elapsed: number; duration?: number; format: 'down' | 'up' }>();
  for (const t of timerStack) {
    let elapsed = t.accumulatedMs || 0;
    if (t.isRunning && isRunning) {
      elapsed += (now - lastUpdate);
    }
    timerStates.set(t.ownerId, {
      elapsed,
      duration: t.durationMs,
      format: t.format,
    });
  }

  // Convert primary to ITimerDisplayEntry shape
  const primaryTimerEntry = primary ? {
    id: primary.id,
    ownerId: primary.ownerId,
    timerMemoryId: '',
    label: primary.label,
    format: primary.format,
    durationMs: primary.durationMs,
    role: primary.isPinned ? 'primary' as const : 'auto' as const,
    accumulatedMs: primaryElapsed,
  } : undefined;

  // Convert secondaries
  const secondaryTimerEntries = secondaries.map(t => ({
    id: t.id,
    ownerId: t.ownerId,
    timerMemoryId: '',
    label: t.label,
    format: t.format,
    durationMs: t.durationMs,
    role: 'auto' as const,
    accumulatedMs: t.accumulatedMs || 0,
  }));

  return (
    <PanelSizeProvider>
      <div className="h-screen w-screen bg-background text-foreground flex overflow-hidden">
        {/* D-Pad flash overlay */}
        {dpadFlash && (
          <div className="fixed inset-0 bg-primary/10 pointer-events-none z-50 animate-in fade-in duration-150" />
        )}

        {/* Left Column: Visual State Panel (stack + lookahead) */}
        <div className="flex-1 min-w-0 bg-secondary/10 border-r border-border">
          <RemoteVisualStatePanel
            displayRows={remoteState.displayRows || []}
            lookahead={remoteState.lookahead || null}
            localNow={now}
            lastUpdate={lastUpdate}
            isRunning={isRunning}
          />
        </div>

        {/* Right Column: Timer & Controls (Clock) */}
        <div className="w-1/2 flex flex-col bg-background transition-all duration-300">
          <div className="flex-1 flex flex-col justify-center">
            <TimerStackView
              elapsedMs={primaryElapsed}
              hasActiveBlock={!!primary}
              onStart={() => sendReceiverEvent('start')}
              onPause={() => sendReceiverEvent('pause')}
              onStop={() => sendReceiverEvent('stop')}
              onNext={() => sendReceiverEvent('next')}
              isRunning={isRunning}
              primaryTimer={primaryTimerEntry}
              subLabel={remoteState.subLabel}
              secondaryTimers={secondaryTimerEntries}
              timerStates={timerStates}
            />
          </div>
          
          <div className="absolute bottom-2 right-2 opacity-10 text-[8px] font-mono tracking-tighter uppercase">
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
