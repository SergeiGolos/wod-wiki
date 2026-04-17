/**
 * DesignSystem / Organisms / TimerStackView
 *
 * The primary timer display used during workout execution.
 * Pure display component — all state passed as props, no live runtime needed.
 *
 * Stories cover:
 *  1. ReadyToStart — no active block, start button visible
 *  2. ActiveFran   — countdown timer running, exercise card visible
 *  3. Paused       — timer stopped mid-workout
 *  4. CountUp      — AMRAP-style up-counting timer
 *  5. CompactMode  — compact layout for embedded views
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TimerStackView } from '@/components/workout/TimerStackView';
import type { ITimerDisplayEntry, IDisplayCardEntry } from '@/clock/types/DisplayTypes';

// ── Fixture helpers ──────────────────────────────────────────────────────────

const franCountdownTimer = (elapsedMs: number): ITimerDisplayEntry => ({
  id: 'timer-fran',
  ownerId: 'block-thrusters',
  timerMemoryId: 'mem-fran',
  label: 'Round 1 — 21 Thrusters',
  format: 'down',
  durationMs: 180_000, // 3:00 target
  accumulatedMs: elapsedMs,
  isRunning: true,
  role: 'primary',
});

const franCard: IDisplayCardEntry = {
  id: 'card-thrusters',
  ownerId: 'block-thrusters',
  type: 'active-block',
  title: '21 Thrusters',
  subtitle: '@ 95 lb',
  metrics: [
    { type: 'reps', value: 21, unit: 'reps' } as any,
    { type: 'weight', value: 95, unit: 'lb' } as any,
  ],
  priority: 1,
};

const amrapUpTimer = (elapsedMs: number): ITimerDisplayEntry => ({
  id: 'timer-amrap',
  ownerId: 'block-amrap',
  timerMemoryId: 'mem-amrap',
  label: '20:00 AMRAP',
  format: 'up',
  durationMs: 1_200_000,
  accumulatedMs: elapsedMs,
  isRunning: true,
  role: 'primary',
});

// ── Animated wrapper ─────────────────────────────────────────────────────────

const LiveTimer: React.FC<{
  isRunning: boolean;
  initialMs?: number;
  children: (elapsedMs: number, isRunning: boolean) => React.ReactNode;
}> = ({ isRunning, initialMs = 0, children }) => {
  const [elapsed, setElapsed] = useState(initialMs);
  const running = useRef(isRunning);
  const lastTick = useRef<number>(Date.now());

  useEffect(() => {
    running.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    const id = setInterval(() => {
      if (running.current) {
        const now = Date.now();
        setElapsed(e => e + (now - lastTick.current));
        lastTick.current = now;
      } else {
        lastTick.current = Date.now();
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  return <>{children(elapsed, isRunning)}</>;
};

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof TimerStackView> = {
  title: 'DesignSystem/Organisms/TimerStackView',
  component: TimerStackView,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="h-[600px] border border-border rounded-lg overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const ReadyToStart: Story = {
  name: 'Ready to start (no active block)',
  render: () => (
    <TimerStackView
      elapsedMs={0}
      hasActiveBlock={false}
      isRunning={false}
      onStart={() => alert('Start!')}
      onPause={() => {}}
      onStop={() => {}}
      onNext={() => {}}
    />
  ),
};

export const ActiveFran: Story = {
  name: 'Active — Fran countdown (3:00 target)',
  render: () => {
    const [running, setRunning] = useState(true);
    return (
      <LiveTimer isRunning={running} initialMs={45_000}>
        {(elapsed) => (
          <TimerStackView
            elapsedMs={elapsed}
            hasActiveBlock
            isRunning={running}
            primaryTimer={franCountdownTimer(elapsed)}
            currentCard={franCard}
            subLabel="Round 1 of 3"
            onStart={() => setRunning(true)}
            onPause={() => setRunning(false)}
            onStop={() => setRunning(false)}
            onNext={() => alert('Next!')}
          />
        )}
      </LiveTimer>
    );
  },
};

export const Paused: Story = {
  name: 'Paused mid-workout',
  render: () => (
    <TimerStackView
      elapsedMs={72_000}
      hasActiveBlock
      isRunning={false}
      primaryTimer={{ ...franCountdownTimer(72_000), isRunning: false }}
      currentCard={franCard}
      subLabel="Round 1 of 3"
      onStart={() => alert('Resume')}
      onPause={() => {}}
      onStop={() => alert('Stop')}
      onNext={() => alert('Next')}
    />
  ),
};

export const AmrapCountUp: Story = {
  name: 'AMRAP count-up (Cindy 20:00)',
  render: () => {
    const [running, setRunning] = useState(true);
    return (
      <LiveTimer isRunning={running} initialMs={325_000}>
        {(elapsed) => (
          <TimerStackView
            elapsedMs={elapsed}
            hasActiveBlock
            isRunning={running}
            primaryTimer={amrapUpTimer(elapsed)}
            subLabel="Round 9"
            onStart={() => setRunning(true)}
            onPause={() => setRunning(false)}
            onStop={() => setRunning(false)}
            onNext={() => alert('Next round')}
          />
        )}
      </LiveTimer>
    );
  },
};

export const CompactMode: Story = {
  name: 'Compact layout (embedded views)',
  render: () => (
    <div className="h-[300px] border border-border rounded-lg overflow-hidden bg-background">
      <TimerStackView
        elapsedMs={45_000}
        hasActiveBlock
        isRunning={false}
        primaryTimer={{ ...franCountdownTimer(45_000), isRunning: false }}
        subLabel="Round 1 of 3"
        compact
        onStart={() => {}}
        onPause={() => {}}
        onStop={() => {}}
        onNext={() => {}}
      />
    </div>
  ),
};
