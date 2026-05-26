/**
 * Spatial Navigation Validation Story
 *
 * Browser-level integration test fixture for WOD-735.
 * Exercises the real useSpatialNavigation hook with focusable DOM elements
 * so Playwright can simulate D-Pad arrow keys and verify focus movement,
 * focus indicators, and activation behaviour in a real browser.
 */

import React, { useCallback, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';

// ── Harness ────────────────────────────────────────────────────────────────

const SpatialNavHarness: React.FC = () => {
  const lastActivatedIdRef = useRef<string | null>(null);

  const handleFocusChanged = useCallback((_id: string | null) => {
    // No-op — avoid triggering re-renders that would cause infinite loops
  }, []);

  const handleSelect = useCallback((id: string, el: HTMLElement) => {
    lastActivatedIdRef.current = id;
    // Apply activation flash class directly (mirrors receiver-rpc.tsx)
    el.classList.add('tv-activating');
    setTimeout(() => el.classList.remove('tv-activating'), 250);
  }, []);

  const { focusedId, getFocusProps } = useSpatialNavigation({
    enabled: true,
    initialFocusId: 'preview-block-0',
    onFocusChanged: handleFocusChanged,
    onSelect: handleSelect,
  });

  const blocks = [
    { id: 'preview-block-0', label: '21 Thrusters @ 95 lb' },
    { id: 'preview-block-1', label: '21 Pull-ups' },
    { id: 'preview-block-2', label: '15 Thrusters @ 95 lb' },
    { id: 'preview-block-3', label: '15 Pull-ups' },
    { id: 'preview-block-4', label: '9 Thrusters @ 95 lb' },
    { id: 'preview-block-5', label: '9 Pull-ups' },
  ];

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex">
      {/* Left panel — preview list (mirrors ReceiverPreviewPanel layout) */}
      <div className="w-1/2 h-full p-8 flex flex-col">
        <h1 className="text-3xl font-bold mb-6">Fran</h1>
        <p className="text-white/60 mb-4">Select a workout to begin</p>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {blocks.map((block) => {
            const props = getFocusProps(block.id);
            return (
              <div
                key={block.id}
                {...props}
                className="tv-focusable flex flex-col rounded-lg border border-border/60 bg-card/50 px-5 py-4 transition-all cursor-pointer hover:border-primary/40 hover:bg-card/80"
                data-testid={block.id}
              >
                <span className="text-lg font-semibold">{block.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel — timer controls (mirrors ReceiverTimerPanel layout) */}
      <div className="w-1/2 h-full flex flex-col items-center justify-center gap-8">
        <div
          {...getFocusProps('timer-main')}
          className="tv-focusable rounded-full w-48 h-48 bg-primary/20 border-4 border-primary flex items-center justify-center text-5xl font-mono"
          data-testid="timer-main"
        >
          00:00
        </div>
        <div className="flex gap-6">
          <button
            {...getFocusProps('btn-stop')}
            className="tv-focusable rounded-lg bg-red-500/20 border border-red-500 px-6 py-3 text-lg"
            data-testid="btn-stop"
          >
            Stop
          </button>
          <button
            {...getFocusProps('btn-next')}
            className="tv-focusable rounded-lg bg-primary/20 border border-primary px-6 py-3 text-lg"
            data-testid="btn-next"
          >
            Next
          </button>
        </div>
      </div>

      {/* Hidden state for Playwright assertions */}
      <div data-testid="spatial-nav-focused-id" className="sr-only">
        {focusedId ?? 'null'}
      </div>
      <div data-testid="spatial-nav-last-activated" className="sr-only">
        {lastActivatedIdRef.current ?? 'null'}
      </div>
    </div>
  );
};

// ── Storybook Meta ──────────────────────────────────────────────────────────

const meta: Meta<typeof SpatialNavHarness> = {
  title: 'testing/SpatialNavigationValidation',
  component: SpatialNavHarness,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'D-Pad Spatial Navigation',
};
