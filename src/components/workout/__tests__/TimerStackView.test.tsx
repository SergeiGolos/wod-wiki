import React from 'react';
import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TimerStackView, getPrimaryTimerFontSizePx } from '../TimerStackView';

describe('TimerStackView', () => {
  afterEach(() => {
    cleanup();
  });

  const baseProps = {
    elapsedMs: 0,
    hasActiveBlock: true,
    onStart: () => {},
    onPause: () => {},
    onStop: () => {},
    onNext: () => {},
    isRunning: false,
  };

  it('increases the primary timer font as the panel gets wider', () => {
    const mediumPanelFont = getPrimaryTimerFontSizePx(800, false);
    const widePanelFont = getPrimaryTimerFontSizePx(1400, false);

    expect(widePanelFont).toBeGreaterThan(mediumPanelFont);
    expect(mediumPanelFont).toBeGreaterThanOrEqual(128);
  });

  // ── Primary timer rendering ──
  it('renders primary timer label and time', () => {
    render(
      <TimerStackView
        {...baseProps}
        primaryTimer={{
          id: 'timer-1',
          ownerId: 'block-1',
          timerMemoryId: '',
          label: 'Thrusters',
          format: 'up',
          accumulatedMs: 65000,
        }}
      />,
    );

    expect(screen.getByText('Thrusters')).toBeDefined();
    expect(screen.getByText('01:05')).toBeDefined();
  });

  // ── Secondary timer list ──
  it('renders secondary timers as compact cards', () => {
    render(
      <TimerStackView
        {...baseProps}
        primaryTimer={{
          id: 'timer-primary',
          ownerId: 'block-primary',
          timerMemoryId: '',
          label: 'Rest',
          format: 'down',
          durationMs: 60000,
          accumulatedMs: 15000,
        }}
        secondaryTimers={[
          {
            id: 'timer-amrap',
            ownerId: 'block-amrap',
            timerMemoryId: '',
            label: 'AMRAP',
            format: 'down',
            durationMs: 1200000,
            accumulatedMs: 300000,
          },
          {
            id: 'timer-round',
            ownerId: 'block-round',
            timerMemoryId: '',
            label: 'Round',
            format: 'up',
            accumulatedMs: 47000,
          },
        ]}
        timerStates={
          new Map([
            ['block-amrap', { elapsed: 300000, duration: 1200000, format: 'down' as const }],
            ['block-round', { elapsed: 47000, duration: undefined, format: 'up' as const }],
          ])
        }
      />,
    );

    expect(screen.getByText('AMRAP')).toBeDefined();
    expect(screen.getByText('15:00')).toBeDefined(); // 1200000 - 300000 = 900000ms = 15:00
    expect(screen.getByText('Round')).toBeDefined();
    expect(screen.getByText('00:47')).toBeDefined();
  });

  it('hides secondary timer section when secondaryTimers is undefined', () => {
    render(
      <TimerStackView
        {...baseProps}
        primaryTimer={{
          id: 'timer-1',
          ownerId: 'block-1',
          timerMemoryId: '',
          label: 'Workout',
          format: 'up',
        }}
      />,
    );

    // Only primary label should appear
    expect(screen.getByText('Workout')).toBeDefined();
    expect(screen.queryByTitle('AMRAP')).toBeNull();
  });

  it('hides secondary timer section when secondaryTimers is empty', () => {
    render(
      <TimerStackView
        {...baseProps}
        primaryTimer={{
          id: 'timer-1',
          ownerId: 'block-1',
          timerMemoryId: '',
          label: 'Workout',
          format: 'up',
        }}
        secondaryTimers={[]}
      />,
    );

    expect(screen.getByText('Workout')).toBeDefined();
    // No secondary timer wrapper should be present
    const timerElements = screen.queryAllByTitle(/AMRAP|Round/);
    expect(timerElements.length).toBe(0);
  });

  // ── Edge cases ──
  it('falls back to accumulatedMs when timerStates entry is missing', () => {
    render(
      <TimerStackView
        {...baseProps}
        primaryTimer={{
          id: 'timer-primary',
          ownerId: 'block-primary',
          timerMemoryId: '',
          label: 'Rest',
          format: 'down',
          durationMs: 60000,
          accumulatedMs: 10000,
        }}
        secondaryTimers={[
          {
            id: 'timer-orphan',
            ownerId: 'block-orphan',
            timerMemoryId: '',
            label: 'Orphan',
            format: 'up',
            accumulatedMs: 90000,
          },
        ]}
        // timerStates map intentionally empty — no entry for block-orphan
      />,
    );

    expect(screen.getByText('Orphan')).toBeDefined();
    expect(screen.getByText('01:30')).toBeDefined(); // 90000ms = 01:30
  });

  it('falls back to "Timer" label when secondary timer has no label', () => {
    render(
      <TimerStackView
        {...baseProps}
        primaryTimer={{
          id: 'timer-primary',
          ownerId: 'block-primary',
          timerMemoryId: '',
          label: 'Rest',
          format: 'down',
          durationMs: 60000,
          accumulatedMs: 10000,
        }}
        secondaryTimers={[
          {
            id: 'timer-no-label',
            ownerId: 'block-no-label',
            timerMemoryId: '',
            format: 'up',
            accumulatedMs: 5000,
          } as any,
        ]}
      />,
    );

    expect(screen.getByText('Timer')).toBeDefined();
    expect(screen.getByText('00:05')).toBeDefined();
  });

  it('clamps countdown secondary timer to 0 when elapsed exceeds duration', () => {
    render(
      <TimerStackView
        {...baseProps}
        primaryTimer={{
          id: 'timer-primary',
          ownerId: 'block-primary',
          timerMemoryId: '',
          label: 'Rest',
          format: 'down',
          durationMs: 60000,
          accumulatedMs: 10000,
        }}
        secondaryTimers={[
          {
            id: 'timer-over',
            ownerId: 'block-over',
            timerMemoryId: '',
            label: 'Overdue',
            format: 'down',
            durationMs: 30000,
            accumulatedMs: 35000,
          },
        ]}
        timerStates={
          new Map([
            ['block-over', { elapsed: 35000, duration: 30000, format: 'down' as const }],
          ])
        }
      />,
    );

    expect(screen.getByText('Overdue')).toBeDefined();
    expect(screen.getByText('00:00')).toBeDefined(); // clamped, not negative
  });

  it('uses timerStates format when it differs from entry format', () => {
    render(
      <TimerStackView
        {...baseProps}
        primaryTimer={{
          id: 'timer-primary',
          ownerId: 'block-primary',
          timerMemoryId: '',
          label: 'Rest',
          format: 'down',
          durationMs: 60000,
          accumulatedMs: 10000,
        }}
        secondaryTimers={[
          {
            id: 'timer-format-diff',
            ownerId: 'block-diff',
            timerMemoryId: '',
            label: 'Diff',
            format: 'up',
            durationMs: 120000,
            accumulatedMs: 60000,
          },
        ]}
        timerStates={
          new Map([
            // timerStates says down with 2m duration, entry says up
            ['block-diff', { elapsed: 60000, duration: 120000, format: 'down' as const }],
          ])
        }
      />,
    );

    // Should show remaining time (down) from timerStates: 120000 - 60000 = 60000ms = 01:00
    expect(screen.getByText('01:00')).toBeDefined();
  });

  it('handles many secondary timers without crashing', () => {
    const manyTimers = Array.from({ length: 10 }, (_, i) => ({
      id: `timer-${i}`,
      ownerId: `block-${i}`,
      timerMemoryId: '',
      label: `Timer ${i}`,
      format: 'up' as const,
      accumulatedMs: i * 1000,
    }));

    render(
      <TimerStackView
        {...baseProps}
        primaryTimer={{
          id: 'timer-primary',
          ownerId: 'block-primary',
          timerMemoryId: '',
          label: 'Rest',
          format: 'down',
          durationMs: 60000,
          accumulatedMs: 10000,
        }}
        secondaryTimers={manyTimers}
      />,
    );

    // All 10 should render
    for (let i = 0; i < 10; i++) {
      expect(screen.getByText(`Timer ${i}`)).toBeDefined();
    }
  });

  it('shows Continue controls when the workout is paused', () => {
    render(
      <TimerStackView
        {...baseProps}
        isPaused
        primaryTimer={{
          id: 'timer-1',
          ownerId: 'block-1',
          timerMemoryId: '',
          label: 'Workout',
          format: 'up',
          accumulatedMs: 65000,
        }}
      />,
    );

    expect(screen.getAllByTitle('Continue').length).toBeGreaterThan(0);
    expect(screen.getByText('Continue')).toBeDefined();
  });

  it('uses primary styling for the compact Next button', () => {
    render(
      <TimerStackView
        {...baseProps}
        compact
        primaryTimer={{
          id: 'timer-1',
          ownerId: 'block-1',
          timerMemoryId: '',
          label: 'Workout',
          format: 'up',
          accumulatedMs: 65000,
        }}
      />,
    );

    const nextButton = screen.getByTitle('Next Block');
    expect(nextButton.className).toContain('bg-primary');
    expect(nextButton.className).toContain('text-primary-foreground');
  });

  it('disables Next while paused and blocks click dispatch', () => {
    let nextCalls = 0;

    render(
      <TimerStackView
        {...baseProps}
        onNext={() => {
          nextCalls += 1;
        }}
        isPaused
        primaryTimer={{
          id: 'timer-1',
          ownerId: 'block-1',
          timerMemoryId: '',
          label: 'Workout',
          format: 'up',
          accumulatedMs: 65000,
        }}
      />,
    );

    const nextButton = screen.getByTitle('Next Block') as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);

    fireEvent.click(nextButton);
    expect(nextCalls).toBe(0);
  });
});
