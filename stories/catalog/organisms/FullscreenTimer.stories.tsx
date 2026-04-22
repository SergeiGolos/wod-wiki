/**
 * Catalog / Organisms / FullscreenTimer
 *
 * FullscreenTimer is the core workout overlay rendered when a user starts a
 * workout from the editor or tracker route. It wraps `RuntimeTimerPanel` in a
 * `FocusedDialog` portal and transitions to a results view (`ReviewGrid`) when
 * the workout completes naturally.
 *
 * ## States illustrated
 *  1. SimpleTimer   — single countdown timer ("10:00 Run"), idle / ready to start
 *  2. Amrap         — 20-min AMRAP with movement list, idle / ready to start
 *  3. Emom          — 10-round EMOM, idle / ready to start
 *  4. RoundsForTime — 5-round Fran rep scheme, idle / ready to start
 *  5. AutoStart     — AMRAP that begins ticking immediately on mount
 *
 * **Note:** Each story renders a full-viewport overlay (FocusedDialog portals
 * to document.body). Click the ✕ button to dismiss.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FullscreenTimer } from '@/components/Editor/overlays/FullscreenTimer';
import type { WodBlock } from '@/components/Editor/types';

// ─── Shared block fixtures ────────────────────────────────────────────────────

const baseBlock = {
  state: 'idle' as const,
  widgetIds: {},
  version: 1,
  createdAt: Date.now(),
};

const simpleTimerBlock: WodBlock = {
  ...baseBlock,
  id: 'story-timer-block',
  startLine: 0,
  endLine: 1,
  content: '10:00 Run',
};

const amrapBlock: WodBlock = {
  ...baseBlock,
  id: 'story-amrap-block',
  startLine: 0,
  endLine: 5,
  content: `20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats`,
};

const emomBlock: WodBlock = {
  ...baseBlock,
  id: 'story-emom-block',
  startLine: 0,
  endLine: 4,
  content: `10x 1:00
  5 Power Cleans
  10 Box Jumps`,
};

const roundsBlock: WodBlock = {
  ...baseBlock,
  id: 'story-rounds-block',
  startLine: 0,
  endLine: 5,
  content: `5x
  21 Thrusters @95lb
  21 Pull-ups`,
};

// ─── FullscreenTimerHarness ───────────────────────────────────────────────────
//
// Thin wrapper that adds a "Launch overlay" button so the FocusedDialog portal
// doesn't immediately cover the Storybook chrome — user must click to open it.

interface HarnessProps {
  block: WodBlock;
  autoStart?: boolean;
  label?: string;
}

const FullscreenTimerHarness: React.FC<HarnessProps> = ({
  block,
  autoStart = false,
  label = 'Open FullscreenTimer',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 bg-background border border-border rounded-xl p-6">
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        FullscreenTimer renders as a full-viewport portal overlay.{' '}
        {autoStart ? 'The timer starts automatically on open.' : 'Press Start to begin.'}
      </p>
      <div className="rounded-lg bg-muted/50 px-4 py-2 font-mono text-xs text-muted-foreground max-w-xs w-full">
        {block.content.split('\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
      >
        {label}
      </button>

      {open && (
        <FullscreenTimer
          block={block}
          autoStart={autoStart}
          onClose={() => setOpen(false)}
          onCompleteWorkout={() => {
            // Keep open to show the results view
          }}
        />
      )}
    </div>
  );
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof FullscreenTimerHarness> = {
  title: 'catalog/organisms/FullscreenTimer',
  component: FullscreenTimerHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'FullscreenTimer — the core workout overlay. Wraps RuntimeTimerPanel in a ' +
          'FocusedDialog portal and transitions to a ReviewGrid results view when ' +
          'the workout finishes. Click **Open FullscreenTimer** in each story to ' +
          'launch the overlay, then press ✕ to dismiss.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Single countdown timer — "10:00 Run". Idle / ready to start. */
export const SimpleTimer: Story = {
  name: 'Simple timer — 10:00 Run',
  args: {
    block: simpleTimerBlock,
    autoStart: false,
    label: 'Open — 10:00 Run',
  },
};

/** 20-min AMRAP — Cindy-style with a movement list. Idle / ready to start. */
export const Amrap: Story = {
  name: 'AMRAP 20 — Cindy',
  args: {
    block: amrapBlock,
    autoStart: false,
    label: 'Open — AMRAP 20',
  },
};

/** 10-round EMOM. Idle / ready to start. */
export const Emom: Story = {
  name: 'EMOM 10 — Power Cleans',
  args: {
    block: emomBlock,
    autoStart: false,
    label: 'Open — EMOM 10',
  },
};

/** 5-round Fran rep scheme. Idle / ready to start. */
export const RoundsForTime: Story = {
  name: 'Rounds for Time — Fran (5×)',
  args: {
    block: roundsBlock,
    autoStart: false,
    label: 'Open — Rounds For Time',
  },
};

/**
 * AMRAP that begins ticking immediately when the overlay opens.
 * Demonstrates the `autoStart` prop used by the tracker route.
 */
export const AutoStart: Story = {
  name: 'AutoStart — AMRAP 20 (immediate)',
  args: {
    block: amrapBlock,
    autoStart: true,
    label: 'Open — AutoStart AMRAP',
  },
};
