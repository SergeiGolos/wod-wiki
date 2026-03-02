import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TimerStackView } from '@/components/workout/TimerStackView';
import { FragmentSourceRow } from '@/components/fragments/FragmentSourceRow';
import { cn } from '@/lib/utils';
import { formatTimeMMSS } from '@/lib/formatTime';
import { Timer, CheckCircle2, ListTree } from 'lucide-react';

/**
 * @deprecated — TVPage was a WebSocket-relay receiver.  Use receiver.html or
 * receiver-main.tsx (both now use WebRTC + Cast SDK) instead.
 */

/** Derive a WS relay URL from query params or hostname (legacy). */
const getLegacyRelayUrl = () => {
    const search = window.location.search || window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(search);
    let url = params.get('relay');
    if (!url) {
        let host = window.location.hostname;
        if (host === '0.0.0.0' || host === '127.0.0.1' || host === 'localhost') {
            host = 'pluto.forest-adhara.ts.net';
        }
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        url = `${protocol}://${host}:8080/ws`;
    }
    return url;
};

const RELAY_URL = getLegacyRelayUrl();

export const TVPage: React.FC = () => {
  const [remoteState, setRemoteState] = useState<any>(null);
  const [, setWsStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(0);
  const [now, setNow] = useState(Date.now());

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
    const search = window.location.search || window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(search);
    const sessionId = params.get('session');
    const deviceId = 'tv-' + uuidv4().substring(0, 4);
    let ws: WebSocket | null = null;

    const connect = () => {
      ws = new WebSocket(RELAY_URL);
      ws.onopen = () => {
        setWsStatus('connected');
        ws!.send(JSON.stringify({
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
    return () => ws?.close();
  }, []);

  if (!remoteState) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white/20 font-mono uppercase tracking-[0.5em]">
        <div className="animate-pulse text-sm">Wod.Wiki // Waiting for Data</div>
      </div>
    );
  }

  const timerStack = remoteState.timerStack || [];
  const primary = timerStack.find((t: any) => t.role === 'primary') || timerStack[0];
  const secondaries = timerStack.filter((t: any) => t !== primary);
  const isRunning = remoteState.workoutState === 'running';
  const displayRows = remoteState.displayRows || [];
  const lookahead = remoteState.lookahead || null;

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
    timerStates.set(t.ownerId || t.id, {
      elapsed,
      duration: t.durationMs,
      format: t.format,
    });
  }

  // Convert primary to display entry shape
  const primaryTimerEntry = primary ? {
    id: primary.id,
    ownerId: primary.ownerId || primary.id,
    timerMemoryId: '',
    label: primary.label,
    format: primary.format,
    durationMs: primary.durationMs,
    role: primary.isPinned ? 'primary' as const : 'auto' as const,
    accumulatedMs: primaryElapsed,
  } : undefined;

  const secondaryTimerEntries = secondaries.map((t: any) => ({
    id: t.id,
    ownerId: t.ownerId || t.id,
    timerMemoryId: '',
    label: t.label,
    format: t.format,
    durationMs: t.durationMs,
    role: 'auto' as const,
    accumulatedMs: t.accumulatedMs || 0,
  }));

  // Render the EXACT layout used in TrackPanel.tsx
  return (
    <div className="h-screen w-screen bg-background text-foreground flex overflow-hidden">
      {/* Left Column: Visual State Panel */}
      <div className="flex-1 min-w-0 bg-secondary/10 border-r border-border">
        <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
          {/* Active Stack Context */}
          <div className="flex-1 min-h-0 flex flex-col">
            {displayRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                <ListTree className="h-8 w-8 mb-2 opacity-20" />
                <span className="text-sm">No Active Blocks</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1 relative">
                {displayRows.map((entry: any, index: number) => {
                  const hasTimer = !!entry.timer;
                  let elapsed = entry.timer?.elapsed ?? 0;
                  if (entry.timer?.isRunning && isRunning) {
                    elapsed += (now - lastUpdate);
                  }

                  return (
                    <div key={entry.blockKey || index} className={cn(
                      "relative w-full",
                      entry.isLeaf ? "animate-in fade-in slide-in-from-left-1 duration-300" : ""
                    )}>
                      <div className={cn(
                        "rounded-md border text-sm transition-all",
                        entry.isLeaf
                          ? "bg-card shadow-sm border-primary/40 ring-1 ring-primary/10"
                          : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50"
                      )}>
                        <div className="flex items-center justify-between gap-3 p-3">
                          <span className={cn(
                            "font-semibold tracking-tight",
                            entry.isLeaf ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {entry.label}
                          </span>
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
                        {entry.rows?.length > 0 && (
                          <div className="flex flex-col gap-0.5 px-3 pb-2">
                            {entry.rows.map((row: any, rowIdx: number) => (
                              <FragmentSourceRow key={rowIdx} fragments={row} size="compact" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Up Next (Lookahead) */}
          <div className="shrink-0 bg-muted/30 border border-dashed rounded-lg">
            <div className="p-3 pb-0">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Up Next</h3>
            </div>
            <div className="p-3">
              {lookahead ? (
                <div className="rounded-md border text-sm bg-card/50 border-border/60">
                  <div className="flex flex-col gap-0.5 p-3">
                    <FragmentSourceRow fragments={lookahead.fragments} size="compact" />
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
      </div>

      {/* Right Column: Timer & Controls (Clock) */}
      <div className="w-1/2 flex flex-col bg-background transition-all duration-300">
        <div className="flex-1 flex flex-col justify-center">
          <TimerStackView
            elapsedMs={primaryElapsed}
            hasActiveBlock={!!primary}
            onStart={() => {}} onPause={() => {}} onStop={() => {}} onNext={() => {}}
            isRunning={isRunning}
            primaryTimer={primaryTimerEntry}
            subLabel={remoteState.subLabel}
            secondaryTimers={secondaryTimerEntries}
            timerStates={timerStates}
          />
        </div>
      </div>
    </div>
  );
};
