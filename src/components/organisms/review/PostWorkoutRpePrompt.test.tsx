/**
 * PostWorkoutRpePrompt tests — the dismissible 0–10 RPE capture banner (#735).
 *
 * Defends the observable contracts:
 *   1. Already answered (user-origin SessionRPE in logs) → prompt does not render.
 *   2. Dismiss and Skip hide the banner without writing anything.
 *   3. Selecting a value calls captureSessionRpe, fires onCaptured, and hides.
 */
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { PostWorkoutRpePrompt } from './PostWorkoutRpePrompt';
import { MetricType } from '@/core/models/Metric';
import type { StoredOutputStatement } from '@/components/Editor/types';

const captureSessionRpe = mock(() => Promise.resolve('captured' as const));
mock.module('@/services/analytics/captureSessionRpe', () => ({
  captureSessionRpe,
}));

const T0 = 1_700_000_000_000;

const baseLog: StoredOutputStatement = {
  id: 1,
  outputType: 'segment',
  timeSpan: { started: T0, ended: T0 + 60_000 },
  metrics: [
    { type: MetricType.Rep, value: 21, image: '21', origin: 'runtime' },
    { type: MetricType.Elapsed, value: 60_000, image: '1:00', origin: 'runtime' },
  ],
  sourceBlockKey: 'block-1',
  stackLevel: 0,
};

function renderPrompt(props: Partial<React.ComponentProps<typeof PostWorkoutRpePrompt>> = {}) {
  const onCaptured = mock(() => {});
  const view = render(
    <PostWorkoutRpePrompt
      resultId="result-1"
      logs={[baseLog]}
      onCaptured={onCaptured}
      {...props}
    />,
  );
  return { ...view, onCaptured };
}

afterEach(() => {
  cleanup();
  captureSessionRpe.mockClear?.();
});

describe('PostWorkoutRpePrompt', () => {
  it('renders nothing when logs already contain a user-origin SessionRPE', () => {
    const userRpe: StoredOutputStatement = {
      id: 2,
      outputType: 'segment',
      timeSpan: { started: T0 + 60_000, ended: T0 + 60_000 },
      metrics: [{ type: MetricType.SessionRPE, value: 7, origin: 'user', image: 'rpe: 7' }],
      sourceBlockKey: 'block-1',
      stackLevel: 0,
    };

    renderPrompt({ logs: [baseLog, userRpe] });

    expect(screen.queryByText(/How hard was that/i)).toBeNull();
  });

  it('shows the prompt when no user-origin SessionRPE exists', () => {
    renderPrompt();

    expect(screen.getByText(/How hard was that/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Skip/i })).toBeDefined();
  });

  it('dismisses the banner without capturing when the close button is clicked', () => {
    const { onCaptured } = renderPrompt();

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(captureSessionRpe).not.toHaveBeenCalled();
    expect(onCaptured).not.toHaveBeenCalled();
    expect(screen.queryByText(/How hard was that/i)).toBeNull();
  });

  it('dismisses the banner without capturing when Skip is clicked', () => {
    const { onCaptured } = renderPrompt();

    const skipButton = screen.getByRole('button', { name: /Skip/i });
    fireEvent.click(skipButton);

    expect(captureSessionRpe).not.toHaveBeenCalled();
    expect(onCaptured).not.toHaveBeenCalled();
    expect(screen.queryByText(/How hard was that/i)).toBeNull();
  });

  it('captures the selected RPE and hides the banner', async () => {
    const { onCaptured } = renderPrompt();

    const button5 = screen.getByRole('button', { name: /5|moderate/i });
    fireEvent.click(button5);

    await waitFor(() => expect(onCaptured).toHaveBeenCalledWith(5));
    expect(screen.queryByText(/How hard was that/i)).toBeNull();
  });

  it('allows selecting the maximum RPE of 10', async () => {
    renderPrompt();

    const button10 = screen.getByRole('button', { name: /10/i });
    fireEvent.click(button10);

    await waitFor(() => expect(captureSessionRpe).toHaveBeenCalledWith('result-1', 10));
  });
});
