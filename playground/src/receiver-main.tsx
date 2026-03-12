import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';
import { CAST_NAMESPACE } from '@/types/cast/messages';
import { ReceiverCastSignaling } from '@/services/cast/CastSignaling';
import { WebRTCTransport } from '@/services/cast/WebRTCTransport';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { MetricSourceRow } from '@/components/metrics/MetricSourceRow';
import { cn } from '@/lib/utils';
import { formatTimeMMSS } from '@/lib/formatTime';
import { Timer, CheckCircle2 } from 'lucide-react';
import '@/index.css';

// ============================================================================
// Types for serialized display state from the WebSocket bridge
// ============================================================================

interface RemoteTimeSpan {
  started: number;   // epoch ms
  ended?: number;    // epoch ms, undefined = still running
}

interface RemoteTimerEntry {
  id: string;
  ownerId: string;
  label: string;
  format: 'up' | 'down';
  durationMs?: number;
  role: 'primary' | 'secondary';
  spans: RemoteTimeSpan[];  // Raw time segments for local interpolation
  isRunning: boolean;
  isPinned?: boolean;
}

interface RemoteDisplayRow {
  blockKey: string;
  blockType?: string;
  label: string;
  isLeaf: boolean;
  depth: number;
  rows: any[][]; // IMetric[][]
  timer: {
    spans: RemoteTimeSpan[];
    durationMs?: number;
    direction: 'up' | 'down';
    isRunning: boolean;
  } | null;
}

interface RemoteState {
  timerStack: RemoteTimerEntry[];
  displayRows: RemoteDisplayRow[];
  lookahead: { metrics: any[] } | null;
  subLabel?: string;
  subLabels?: string[];
  workoutState: string;
}

// ============================================================================
// Shared utility: compute elapsed from spans (mirrors src/lib/timeUtils.ts)
// ============================================================================

function calculateElapsedFromSpans(spans: RemoteTimeSpan[] | undefined, now: number): number {
  if (!spans || spans.length === 0) return 0;
  return spans.reduce((total, span) => {
    const end = span.ended ?? now;
    return total + Math.max(0, end - span.started);
  }, 0);
}

// ============================================================================
// RemoteStackBlockItem — Mirrors StackBlockItem from VisualStateComponents
// ============================================================================

const RemoteStackBlockItem: React.FC<{
  entry: RemoteDisplayRow;
  localNow: number;
}> = ({ entry, localNow }) => {
  const hasTimer = !!entry.timer;

  // Compute elapsed directly from spans — no offset needed
  const elapsed = hasTimer ? calculateElapsedFromSpans(entry.timer!.spans, localNow) : 0;

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
                      "tracking-tight",
                      entry.isLeaf ? "text-base font-bold text-foreground" : "text-xs font-medium text-muted-foreground/70"
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
              <MetricSourceRow
                key={rowIdx}
                metrics={row}
                size={entry.isLeaf ? "normal" : "compact"}
                isLeaf={entry.isLeaf}
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
  lookahead: { metrics: any[] } | null;
  localNow: number;
  workoutState: string;
  sessionElapsedMs: number;
}> = ({ displayRows, lookahead, localNow, workoutState, sessionElapsedMs }) => {

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
      {/* 1. Session Header with overall timer */}
      <div className="shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Session</h2>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded font-mono text-xs font-bold bg-primary/10 text-primary">
            <Timer className="h-3 w-3" />
            {formatTimeMMSS(sessionElapsedMs)}
          </div>
        </div>
      </div>

      {/* 2. Workout State / Active Block */}
      <div className="shrink-0">
        {displayRows.length > 0 ? (
          <div className="flex flex-col gap-1 relative">
            {displayRows.map((entry, index) => (
              <RemoteStackBlockItem
                key={entry.blockKey || index}
                entry={entry}
                localNow={localNow}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card p-4">
            <span className="text-base font-medium text-foreground capitalize">
              {workoutState || 'Ready to Start'}
            </span>
          </div>
        )}
      </div>

      {/* 3. Spacer to push Up Next to bottom */}
      <div className="flex-1 min-h-0" />

      {/* 4. Up Next (Lookahead) */}
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
                <MetricSourceRow
                  metrics={lookahead.metrics}
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
  const [connectionStatus, setConnectionStatus] = useState('waiting-for-cast');
  const [now, setNow] = useState(Date.now());
  const [dpadFlash, setDpadFlash] = useState(false);
  const transportRef = React.useRef<WebRTCTransport | null>(null);

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

  // WebRTC connection via Cast Receiver SDK
  useEffect(() => {
    // The Cast Receiver SDK is loaded in the HTML shell via <script> tag.
    // We access it from the global `cast` object.
    const castContext = (window as any).cast?.framework?.CastReceiverContext?.getInstance();
    if (!castContext) {
      console.error('[ReceiverApp] Cast Receiver SDK not loaded');
      setConnectionStatus('error: no Cast SDK');
      return;
    }

    const signaling = new ReceiverCastSignaling(castContext);
    const transport = new WebRTCTransport('answerer', signaling);
    transportRef.current = transport;

    transport.on('message', (data: unknown) => {
      const msg = data as { type: string; payload: any };
      if (msg.type === 'state-update') {
        setRemoteState(msg.payload.displayState);
      }
    });

    transport.on('connected', () => {
      console.log('[ReceiverApp] WebRTC DataChannel open');
      setConnectionStatus('connected');
    });

    transport.on('disconnected', () => {
      console.log('[ReceiverApp] WebRTC disconnected');
      setConnectionStatus('disconnected');
    });

    // Start the CAF receiver context — custom namespaces MUST be declared
    // in the start options or the Cast framework rejects all messages.
    // Use 'JSON' type — the SDK auto-parses incoming messages as objects.
    castContext.start({
      customNamespaces: {
        [CAST_NAMESPACE]: 'JSON'
      }
    });
    setConnectionStatus('cast-ready');

    // connect() as answerer — waits for offer from sender
    transport.connect().catch((err: unknown) => {
      console.error('[ReceiverApp] WebRTC connect failed', err);
      setConnectionStatus('error');
    });

    return () => {
      transport.dispose();
      transportRef.current = null;
    };
  }, []);

  // ── Send event back to caster via WebRTC DataChannel ──
  const sendReceiverEvent = React.useCallback((eventName: string) => {
    const transport = transportRef.current;
    if (!transport || !transport.isConnected) {
      console.warn(`[ReceiverApp] Cannot send event "${eventName}" - transport not connected`);
      return;
    }
    console.log(`[ReceiverApp] Sending event: ${eventName}`);
    transport.send({
      type: 'event-from-receiver',
      messageId: 'evt-' + uuidv4().substring(0, 6),
      timestamp: Date.now(),
      payload: {
        event: {
          name: eventName,
          timestamp: Date.now()
        }
      }
    });
  }, []);

  // ── D-Pad key handler + focus management for Chromecast remote ──
  useEffect(() => {
    // Ensure body can receive focus
    document.body.tabIndex = 0;
    document.body.focus();

    const refocus = () => {
      if (document.activeElement !== document.body) {
        document.body.focus();
      }
    };
    
    // Check focus every second and on blur
    const focusInterval = setInterval(refocus, 1000);
    window.addEventListener('blur', refocus);

    const handleKey = (e: KeyboardEvent) => {
      console.log(`[ReceiverApp] Key pressed: "${e.key}" (code: ${e.code}, keyCode: ${e.keyCode})`);
      
      const isSelect = 
        e.key === 'Enter' || 
        e.key === 'Select' || 
        e.key === 'Center' || 
        e.key === 'Ok' || 
        e.key === 'Accept' || 
        e.key === ' ' ||
        e.keyCode === 13 || // Enter
        e.keyCode === 23 || // Center/Select
        e.keyCode === 32;   // Space
      
      const isPlayPause = 
        e.key === 'MediaPlayPause' || 
        e.keyCode === 179;

      if (isSelect || isPlayPause) {
        e.preventDefault();
        console.log(`[ReceiverApp] Triggering "next" event from ${e.key || e.keyCode}`);
        sendReceiverEvent('next');
        setDpadFlash(true);
        setTimeout(() => setDpadFlash(false), 200);
        return;
      }

      switch (e.key) {
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
      clearInterval(focusInterval);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('blur', refocus);
    };
  }, [sendReceiverEvent]);

  // ── Waiting screen ──
  if (!remoteState) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/20 font-mono uppercase tracking-[0.5em]">
        <div className="animate-pulse">Wod.Wiki // {connectionStatus}</div>
      </div>
    );
  }

  // ── Derive timer props (mirrors StackIntegratedTimer logic) ──
  const timerStack = remoteState.timerStack || [];
  const primary = timerStack.find(t => t.role === 'primary') || timerStack[0];
  const secondaries = timerStack.filter(t => t !== primary);
  const isRunning = remoteState.workoutState === 'running';

  // Compute elapsed directly from spans — no offset interpolation needed
  const primaryElapsed = primary ? calculateElapsedFromSpans(primary.spans, now) : 0;

  // Build timerStates map for TimerStackView
  const timerStates = new Map<string, { elapsed: number; duration?: number; format: 'down' | 'up' }>();
  for (const t of timerStack) {
    timerStates.set(t.ownerId, {
      elapsed: calculateElapsedFromSpans(t.spans, now),
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
    accumulatedMs: calculateElapsedFromSpans(t.spans, now),
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
            workoutState={remoteState.workoutState}
            sessionElapsedMs={primaryElapsed}
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
              subLabels={remoteState.subLabels}
              secondaryTimers={secondaryTimerEntries}
              timerStates={timerStates}
            />
          </div>
          
          <div className="absolute bottom-2 right-2 opacity-10 text-[8px] font-mono tracking-tighter uppercase">
            {connectionStatus} // {remoteState.workoutState}
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
