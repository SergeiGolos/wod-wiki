/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROTOTYPE — THROWAWAY. Delete or absorb after a variant wins.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Question: "What should the mobile fullscreen wallclock timer look like?"
 * Plan: three variants of the mobile timer, switchable via ?proto-timer=A|B|C,
 * mounted inside the existing FullscreenTimer surface (RuntimeTimerBody hook-in
 * at the bottom of RuntimeTimerPanel.tsx).
 *
 *   A — Stage:   slim status strip top, hero clock owns the screen, deduped.
 *   B — Deck:    ambient clock zone top, bottom-sheet "deck" holds context + controls.
 *   C — Mono:    single centered column, no cards, one full-width NEXT.
 *
 * Try it: open any runnable wod block (e.g. /guide/syntax/basics → Run) with
 * ?proto-timer=A in the URL, in a mobile viewport. ←/→ or the bottom bar cycles.
 *
 * Prototype constraints: no tests, no error handling, state via hooks only.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, SkipForward, Square, ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { useNextPreview, usePrimaryTimer, useStackTimers, useStackDisplayRows, useRoundDisplay } from '@/hooks/useRuntimeTimer';
import { useWorkbenchSession } from '@/stores/workbenchSessionStore';
import { calculateDuration } from '@/lib/timeUtils';
import { formatTimeMMSS } from '@/lib/formatTime';
import { metricPresentation } from '@/core/metrics/presentation';
import { cn } from '@/lib/utils';

// ── Variant plumbing ─────────────────────────────────────────────────────

const VARIANTS = ['A', 'B', 'C'] as const;
type VariantKey = (typeof VARIANTS)[number];
const VARIANT_NAMES: Record<VariantKey, string> = {
  A: 'Stage',
  B: 'Deck',
  C: 'Mono',
};

export function getProtoTimerVariant(): VariantKey | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('proto-timer');
  return VARIANTS.includes(v as VariantKey) ? (v as VariantKey) : null;
}

function setProtoTimerVariant(v: VariantKey) {
  const url = new URL(window.location.href);
  url.searchParams.set('proto-timer', v);
  window.history.replaceState(null, '', url.toString());
}

/** Floating variant switcher — dev only, obviously-not-product chrome. */
const ProtoSwitcher: React.FC<{ current: VariantKey; onCycle: (v: VariantKey) => void }> = ({ current, onCycle }) => {
  if (import.meta.env.PROD) return null;
  const cycle = (dir: 1 | -1) => {
    const idx = VARIANTS.indexOf(current);
    onCycle(VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length]);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'ArrowLeft') cycle(-1);
      if (e.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[200] flex flex-col items-center gap-1 rounded-l-xl bg-zinc-900/90 text-white shadow-2xl border border-white/20 border-r-0 px-1 py-2 text-[10px] font-mono select-none">
      <button className="p-1 rounded-full hover:bg-white/10" onClick={() => cycle(-1)} aria-label="Previous variant">
        <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
      </button>
      <span className="px-0.5 py-1 whitespace-nowrap [writing-mode:vertical-rl]">PROTO {current} — {VARIANT_NAMES[current]}</span>
      <button className="p-1 rounded-full hover:bg-white/10" onClick={() => cycle(1)} aria-label="Next variant">
        <ChevronRight className="w-3.5 h-3.5 rotate-90" />
      </button>
    </div>
  );
};

// ── Shared model (data only — variants own all layout) ───────────────────

export interface ProtoTimerHandlers {
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  isPaused: boolean;
}

export interface ProtoTimerModel {
  mainLabel: string;
  subLabels?: string[];
  displayMs: number;
  sessionElapsedMs: number;
  secondaryTimers: Array<{ id: string; label: string; displayMs: number }>;
  upNext: string | null;
  roundLabel?: string;
  isRunning: boolean;
  isPaused: boolean;
  isNextDisabled: boolean;
}

function useProtoTimerModel(handlers: ProtoTimerHandlers): ProtoTimerModel {
  const executionStatus = useWorkbenchSession(s => s.execution.status);
  const primaryTimer = usePrimaryTimer();
  const allTimers = useStackTimers();
  const stackItems = useStackDisplayRows();
  const roundsItem = stackItems?.find(i => i.block.blockType === 'Rounds');
  const roundDisplay = useRoundDisplay(roundsItem?.block);
  const nextPreview = useNextPreview();

  const isAnyTimerRunning = allTimers.some(t => t.timer.spans.some(s => s.ended === undefined));
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isAnyTimerRunning) return;
    let id: number;
    const tick = () => { setNow(Date.now()); id = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(id);
  }, [isAnyTimerRunning]);

  const model = useMemo(() => {
    const leafItem = stackItems?.find(i => i.isLeaf);
    const leafLabel = leafItem?.label;
    const roundsLabel = roundDisplay?.label ?? roundsItem?.label;

    const leafTimer = leafItem ? allTimers.find(t => t.block.key.toString() === leafItem.block.key.toString()) : undefined;
    const active = (primaryTimer?.isPinned ? primaryTimer : leafTimer || primaryTimer);

    const mainLabel = (primaryTimer?.isPinned ? (roundsLabel || primaryTimer.timer.label) : (roundsLabel && roundsLabel !== leafLabel ? roundsLabel : leafLabel || primaryTimer?.timer.label)) || 'Timer';
    const subLabel = mainLabel === leafLabel ? undefined : leafLabel;

    // Multi-line leaf rows (grouped statements)
    let subLabels: string[] | undefined;
    if (leafItem?.displayRows && leafItem.displayRows.length > 1) {
      const lines = leafItem.displayRows
        .map(row => metricPresentation.presentGroup([...row], 'timer-subtitle').filter(t => t.visible).map(t => t.label).filter(Boolean).join(' ').trim())
        .filter(Boolean);
      if (lines.length > 0) subLabels = lines;
    }
    if (!subLabels) subLabels = subLabel ? [subLabel] : undefined;

    // Clock value (countdown-aware)
    let displayMs = 0;
    if (active) {
      const elapsed = calculateDuration(active.timer.spans, now);
      displayMs = active.timer.direction === 'down' && active.timer.durationMs
        ? Math.max(0, active.timer.durationMs - elapsed)
        : elapsed;
    }

    // Session = the pinned primary timer when present, else the longest-running
    // timer (session block starts first and outlives every leaf). Deduped from
    // both the clock and the secondary chips.
    const withElapsed = allTimers.map(t => ({ t, elapsed: calculateDuration(t.timer.spans, now) }));
    const sessionEntry = primaryTimer?.isPinned
      ? { t: primaryTimer, elapsed: calculateDuration(primaryTimer.timer.spans, now) }
      : withElapsed.reduce((best, cur) => (cur.elapsed > (best?.elapsed ?? -1) ? cur : best), withElapsed[0]);
    const sessionElapsedMs = sessionEntry?.elapsed ?? 0;

    // Secondary timers (excluding the active one and the session one)
    const activeKey = active?.block.key.toString();
    const sessionKey = sessionEntry?.t.block.key.toString();
    const secondaryTimers = allTimers
      .filter(t => {
        const k = t.block.key.toString();
        return k !== activeKey && k !== sessionKey;
      })
      .map(t => {
        const elapsed = calculateDuration(t.timer.spans, now);
        return {
          id: t.block.key.toString(),
          label: t.timer.label,
          displayMs: t.timer.direction === 'down' && t.timer.durationMs ? Math.max(0, t.timer.durationMs - elapsed) : elapsed,
        };
      });

    // One-line up-next label
    let upNext: string | null = null;
    if (nextPreview?.metrics) {
      upNext = metricPresentation
        .presentGroup([...nextPreview.metrics], 'timer-subtitle')
        .filter(t => t.visible).map(t => t.label).filter(Boolean).join(' ').trim() || null;
    }

    return { mainLabel, subLabels, displayMs, sessionElapsedMs, secondaryTimers, upNext, roundLabel: roundDisplay?.label };
  }, [primaryTimer, allTimers, stackItems, now, roundDisplay, roundsItem, nextPreview]);

  return {
    ...model,
    isRunning: isAnyTimerRunning || executionStatus === 'running',
    isPaused: handlers.isPaused,
    isNextDisabled: handlers.isPaused,
  };
}

// ── Small shared atoms (chrome only, not layout) ─────────────────────────

const BigClock: React.FC<{ ms: number; className?: string; style?: React.CSSProperties }> = ({ ms, className, style }) => (
  <span
    role="timer"
    aria-live="polite"
    aria-atomic="true"
    className={cn('font-mono font-bold tracking-tighter text-foreground tabular-nums leading-none', className)}
    style={style}
  >
    {formatTimeMMSS(ms)}
  </span>
);

const NextButton: React.FC<{ m: ProtoTimerModel; h: ProtoTimerHandlers; className?: string }> = ({ m, h, className }) => (
  <button
    onClick={m.isNextDisabled ? undefined : h.onNext}
    disabled={m.isNextDisabled}
    className={cn(
      'flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] disabled:bg-muted disabled:text-muted-foreground disabled:opacity-60 disabled:shadow-none',
      className,
    )}
  >
    <span className="text-base font-bold tracking-widest uppercase">Next</span>
    <SkipForward className="w-5 h-5" />
  </button>
);

const PauseButton: React.FC<{ m: ProtoTimerModel; h: ProtoTimerHandlers; className?: string }> = ({ m, h, className }) => (
  <button
    onClick={m.isPaused ? h.onStart : m.isRunning ? h.onPause : h.onStart}
    className={cn('flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95', className)}
    title={m.isPaused ? 'Continue' : m.isRunning ? 'Pause' : 'Start'}
  >
    {m.isPaused || !m.isRunning ? <Play className="w-6 h-6 ml-0.5" /> : <Pause className="w-6 h-6" />}
  </button>
);

const SecondaryChips: React.FC<{ m: ProtoTimerModel }> = ({ m }) => (
  m.secondaryTimers.length > 0 ? (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {m.secondaryTimers.map(st => (
        <div key={st.id} className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
          <Timer className="w-3 h-3" />
          <span className="font-medium truncate max-w-[100px]">{st.label}</span>
          <span className="font-mono font-semibold tabular-nums">{formatTimeMMSS(st.displayMs)}</span>
        </div>
      ))}
    </div>
  ) : null
);

// ════════════════════════════════════════════════════════════════════════
// VARIANT A — "Stage": slim status strip, hero clock, deduped everything
// ════════════════════════════════════════════════════════════════════════

const VariantStage: React.FC<{ m: ProtoTimerModel; h: ProtoTimerHandlers }> = ({ m, h }) => (
  <div className="flex h-full flex-col bg-background">
    {/* Status strip — session + up-next, one line, 40px */}
    <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border/60 pl-4 pr-28 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5 font-mono tabular-nums">
        <Timer className="w-3.5 h-3.5" />{formatTimeMMSS(m.sessionElapsedMs)}
      </span>
      <span className="truncate italic">{m.upNext ? `Up next: ${m.upNext}` : 'End of section'}</span>
    </div>

    {/* Hero clock — owns the screen, sized from BOTH axes */}
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{m.mainLabel}</h2>
      <BigClock ms={m.displayMs} style={{ fontSize: 'clamp(72px, min(24vw, 26vh), 220px)' }} />
      {m.subLabels && (
        <div className="space-y-0.5 text-center">
          {m.subLabels.map((l, i) => <p key={i} className="text-sm text-muted-foreground">{l}</p>)}
        </div>
      )}
      <SecondaryChips m={m} />
    </div>

    {/* Thumb controls — stop pushed away from pause */}
    <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        onClick={h.onStop}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-muted-foreground active:scale-95"
        title="Stop session"
      >
        <Square className="w-4 h-4" />
      </button>
      <PauseButton m={m} h={h} className="h-14 w-14" />
      <NextButton m={m} h={h} className="h-14 flex-1" />
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════
// VARIANT B — "Deck": ambient clock zone + bottom sheet with context+controls
// ════════════════════════════════════════════════════════════════════════

const VariantDeck: React.FC<{ m: ProtoTimerModel; h: ProtoTimerHandlers }> = ({ m, h }) => (
  <div className="flex h-full flex-col bg-background">
    {/* Ambient clock zone — label floats above the clock, nothing else competes */}
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-6">
      <span className="absolute left-4 top-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground tabular-nums">
        Session {formatTimeMMSS(m.sessionElapsedMs)}
      </span>
      <BigClock ms={m.displayMs} style={{ fontSize: 'clamp(80px, min(26vw, 30vh), 240px)' }} />
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{m.mainLabel}</h2>
      {m.subLabels && <p className="mt-0.5 text-sm text-muted-foreground">{m.subLabels.join(' · ')}</p>}
    </div>

    {/* Deck — bottom sheet owns all context + controls */}
    <div className="shrink-0 rounded-t-3xl border-t border-border bg-muted/40 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="italic truncate">{m.upNext ? `Up next: ${m.upNext}` : 'End of section'}</span>
        <button onClick={h.onStop} className="ml-3 shrink-0 font-medium uppercase tracking-wider text-muted-foreground hover:text-destructive">
          End
        </button>
      </div>
      <SecondaryChips m={m} />
      <div className="mt-3 flex items-center gap-3">
        <PauseButton m={m} h={h} className="h-14 w-14 shrink-0" />
        <NextButton m={m} h={h} className="h-14 flex-1" />
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════
// VARIANT C — "Mono": one centered column, zero cards, full-width NEXT
// ════════════════════════════════════════════════════════════════════════

const VariantMono: React.FC<{ m: ProtoTimerModel; h: ProtoTimerHandlers }> = ({ m, h }) => (
  <div className="flex h-full flex-col bg-background px-6">
    <div className="flex shrink-0 items-center justify-center pt-5">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
        {m.roundLabel ?? 'Session'} · {formatTimeMMSS(m.sessionElapsedMs)}
      </span>
    </div>

    <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <BigClock ms={m.displayMs} style={{ fontSize: 'clamp(88px, min(28vw, 32vh), 260px)' }} />
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{m.mainLabel}</h2>
      {m.subLabels && <p className="mt-1 text-sm text-muted-foreground">{m.subLabels.join(' · ')}</p>}
      <p className="mt-4 text-xs italic text-muted-foreground/70">{m.upNext ? `then ${m.upNext}` : 'last one'}</p>
    </div>

    <div className="flex shrink-0 items-center justify-center gap-6 pb-3 text-sm text-muted-foreground">
      <button onClick={m.isPaused ? h.onStart : h.onPause} className="px-2 py-1 font-medium hover:text-foreground">
        {m.isPaused ? 'resume' : 'pause'}
      </button>
      <span className="text-border">·</span>
      <button onClick={h.onStop} className="px-2 py-1 font-medium hover:text-destructive">end</button>
    </div>
    <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <NextButton m={m} h={h} className="h-16 w-full" />
    </div>
  </div>
);

// ── Entry (mounted from RuntimeTimerBody when ?proto-timer= is present) ──

export const ProtoTimerMobile: React.FC<ProtoTimerHandlers> = (handlers) => {
  const [variant, setVariant] = useState<VariantKey>(() => getProtoTimerVariant() ?? 'A');
  const m = useProtoTimerModel(handlers);

  const cycle = (v: VariantKey) => {
    setVariant(v);
    setProtoTimerVariant(v);
  };

  return (
    <>
      {variant === 'A' && <VariantStage m={m} h={handlers} />}
      {variant === 'B' && <VariantDeck m={m} h={handlers} />}
      {variant === 'C' && <VariantMono m={m} h={handlers} />}
      <ProtoSwitcher current={variant} onCycle={cycle} />
    </>
  );
};
