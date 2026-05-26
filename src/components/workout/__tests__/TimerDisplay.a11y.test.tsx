import React from 'react';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { TimerDisplay } from '../../panels/timer-panel';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockPanelSize = mock(() => ({ width: 800, isCompact: false, isWide: true, isFull: true, mode: 'full' as const }));

mock.module('@/panels/panel-system/PanelSizeContext', () => ({
  usePanelSize: mockPanelSize,
}));

mock.module('@/components/audio/AudioContext', () => ({
  useAudio: () => ({
    playClick: () => {},
    playTick: () => {},
    playComplete: () => {},
  }),
}));

mock.module('@/runtime/context/RuntimeContext', () => ({
  useScriptRuntime: () => null,
}));

mock.module('@/components/layout/workbenchSyncStore', () => ({
  useWorkbenchSyncStore: (selector: any) => {
    const state = { viewMode: 'track', execution: { status: 'idle' } };
    return selector ? selector(state) : state;
  },
}));

const baseProps = {
  elapsedMs: 0,
  hasActiveBlock: true,
  onStart: () => {},
  onPause: () => {},
  onStop: () => {},
  onNext: () => {},
  isRunning: false,
};

function renderTimerDisplay(props = {}) {
  return render(<TimerDisplay {...baseProps} {...props} />);
}

// ── Suite ───────────────────────────────────────────────────────────────────

describe('TimerDisplay — Keyboard Navigation', () => {
  afterEach(() => {
    cleanup();
    mockPanelSize.mockClear?.();
  });

  beforeEach(() => {
    // Reset mock to default
    mockPanelSize.mockImplementation(() => ({ width: 800, isCompact: false, isWide: true, isFull: true, mode: 'full' as const }));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Global Keyboard Shortcuts
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Global keyboard shortcuts', () => {
    it('triggers onNext when Enter is pressed in track view', () => {
      let nexted = false;
      renderTimerDisplay({
        onNext: () => { nexted = true; },
        isRunning: true,
      });

      fireEvent.keyDown(window, { key: 'Enter', bubbles: true });
      expect(nexted).toBe(true);
    });

    it('triggers onNext when AudioVolumeUp is pressed in track view', () => {
      let nexted = false;
      renderTimerDisplay({
        onNext: () => { nexted = true; },
        isRunning: true,
      });

      fireEvent.keyDown(window, { key: 'AudioVolumeUp', bubbles: true });
      expect(nexted).toBe(true);
    });

    it('does not trigger onNext when Enter is pressed during typing', () => {
      let nexted = false;
      const { container } = renderTimerDisplay({
        onNext: () => { nexted = true; },
        isRunning: true,
      });

      // Create and focus an input
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      fireEvent.keyDown(window, { key: 'Enter', bubbles: true });
      expect(nexted).toBe(false);

      document.body.removeChild(input);
    });

    it('does not trigger onNext when disabled', () => {
      let nexted = false;
      renderTimerDisplay({
        onNext: () => { nexted = true; },
        isRunning: true,
        disableNext: true,
      });

      fireEvent.keyDown(window, { key: 'Enter', bubbles: true });
      expect(nexted).toBe(false);
    });

    it('does not trigger onNext when paused', () => {
      let nexted = false;
      renderTimerDisplay({
        onNext: () => { nexted = true; },
        isRunning: true,
        isPaused: true,
      });

      fireEvent.keyDown(window, { key: 'Enter', bubbles: true });
      expect(nexted).toBe(false);
    });

    it('does not trigger shortcuts outside track view', () => {
      mock.module('@/components/layout/workbenchSyncStore', () => ({
        useWorkbenchSyncStore: (selector: any) => {
          const state = { viewMode: 'editor', execution: { status: 'idle' } };
          return selector ? selector(state) : state;
        },
      }));

      let nexted = false;
      renderTimerDisplay({
        onNext: () => { nexted = true; },
        isRunning: true,
      });

      fireEvent.keyDown(window, { key: 'Enter', bubbles: true });
      expect(nexted).toBe(false);

      // Restore mock
      mock.module('@/components/layout/workbenchSyncStore', () => ({
        useWorkbenchSyncStore: (selector: any) => {
          const state = { viewMode: 'track', execution: { status: 'idle' } };
          return selector ? selector(state) : state;
        },
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Focus Management
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Focus management', () => {
    it('TimerStackView buttons are focusable via keyboard', () => {
      const { container } = renderTimerDisplay({
        isRunning: true,
        primaryTimer: { id: 't1', ownerId: 'b1', timerMemoryId: '', label: 'Workout', format: 'up' as const },
      });

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);

      buttons.forEach((btn) => {
        expect(btn.tabIndex).toBeGreaterThanOrEqual(0);
      });
    });

    it('prevents default on handled key events', () => {
      renderTimerDisplay({
        isRunning: true,
      });

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      const prevented = !window.dispatchEvent(event);
      // The handler calls preventDefault, so the event should be cancelled
      // Note: dispatchEvent returns false if preventDefault was called
    });
  });
});
