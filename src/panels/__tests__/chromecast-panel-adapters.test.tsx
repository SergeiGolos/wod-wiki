import React from 'react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';

let capturedTimerDisplayProps: any;

mock.module('@/panels/visual-state-panel', () => ({
  VisualStatePanel: () => <div data-testid="visual-state-panel" />,
}));

mock.module('@/runtime/hooks/useStackSnapshot', () => ({
  useSnapshotBlocks: () => [{ key: { toString: () => 'block-1' } }],
}));

mock.module('@/panels/timer-panel', () => ({
  TimerDisplay: (props: any) => {
    capturedTimerDisplayProps = props;
    return <div data-testid="timer-display" />;
  },
}));

describe('chromecast panel adapters', () => {
  afterEach(() => {
    cleanup();
    capturedTimerDisplayProps = undefined;
  });

  it('ReceiverStackPanel delegates to shared VisualStatePanel', async () => {
    const { ReceiverStackPanel } = await import('../track-panel-chromecast');

    render(<ReceiverStackPanel />);

    expect(screen.getByTestId('visual-state-panel')).toBeDefined();
  });

  it('ReceiverTimerPanel delegates to shared TimerDisplay and forwards events via provider', async () => {
    const { ReceiverTimerPanel } = await import('../timer-panel-chromecast');
    const dispatch = mock(() => {});

    render(
      <ReceiverTimerPanel
        eventProvider={{
          dispatch,
          onEvent: () => () => {},
          dispose: () => {},
        }}
      />,
    );

    expect(screen.getByTestId('timer-display')).toBeDefined();
    expect(capturedTimerDisplayProps).toBeDefined();
    expect(capturedTimerDisplayProps.enableDisplayStack).toBe(true);
    expect(capturedTimerDisplayProps.hasActiveBlock).toBe(true);

    capturedTimerDisplayProps.onStart();
    capturedTimerDisplayProps.onPause();
    capturedTimerDisplayProps.onStop();
    capturedTimerDisplayProps.onNext();

    const dispatchedNames = dispatch.mock.calls.map((call: any[]) => call[0]?.name);
    expect(dispatchedNames).toEqual(['start', 'pause', 'stop', 'next']);
  });
});
