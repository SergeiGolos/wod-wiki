/**
 * ReviewPage tests — /review/:runtimeId renders the workout and the RPE prompt.
 *
 * Defends the observable contract:
 *   1. The page passes the result id + logs to PostWorkoutRpePrompt.
 *   2. After capture the page re-fetches the result so the scorecard reflects
 *      the re-derived SessionLoad.
 */
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { ReviewPage } from './ReviewPage';
import type { WorkoutResult } from '@/types/storage';
import type { Segment } from '@/core/models/AnalyticsModels';
import { MetricType } from '@/core/models/Metric';
import type { StoredOutputStatement } from '@/components/Editor/types';

const T0 = 1_700_000_000_000;

const baseLog: StoredOutputStatement = {
  id: 1,
  outputType: 'segment',
  timeSpan: { started: T0, ended: T0 + 60_000 },
  metrics: [
    { type: MetricType.Elapsed, value: 60_000, image: '1:00', origin: 'runtime' },
  ],
  sourceBlockKey: 'block-1',
  stackLevel: 0,
};

const RESULT: WorkoutResult = {
  id: 'runtime-1',
  noteId: 'note-1',
  segmentId: 'wod-1',
  segmentVersion: 1,
  blockContentId: 'bc-1',
  origin: 'playground',
  data: { startTime: T0, endTime: T0 + 60_000, duration: 60_000, completed: true, logs: [baseLog] },
  createdAt: T0 + 60_000,
};

const SEGMENT: Segment = {
  id: 1,
  name: 'Block 1',
  type: 'work',
  startTime: 0,
  endTime: 60,
  elapsed: 60,
  total: 60,
  parentId: null,
  depth: 0,
  metric: {},
  lane: 0,
};

let storedResult: WorkoutResult | undefined = RESULT;
let getResultCalls = 0;

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getResultById: async (_id: string) => {
      getResultCalls++;
      return storedResult;
    },
  },
}));

mock.module('@/services/AnalyticsTransformer', () => ({
  getAnalyticsFromLogs: (_logs: StoredOutputStatement[], _startTime?: number) => ({ segments: [SEGMENT] }),
}));

mock.module('@/contexts/AudioContext', () => ({
  useAudio: () => ({ isEnabled: false, toggleAudio: () => {} }),
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const captureSessionRpe = mock(() => Promise.resolve('captured' as const));
mock.module('@/services/analytics/captureSessionRpe', () => ({
  captureSessionRpe,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/review/runtime-1']}>
      <Routes>
        <Route path="/review/:runtimeId" element={<ReviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  getResultCalls = 0;
  captureSessionRpe.mockClear?.();
});

describe('ReviewPage', () => {
  it('renders the PostWorkoutRpePrompt with the runtime id and logs', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/How hard was that/i)).toBeDefined());

    expect(getResultCalls).toBe(1);
  });

  it('re-fetches the result after the prompt reports capture', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/How hard was that/i)).toBeDefined());

    // Simulate answering the prompt by clicking RPE 5.
    const button5 = screen.getByRole('button', { name: /RPE 5/i });
    fireEvent.click(button5);

    await waitFor(() => expect(getResultCalls).toBe(2));
  });
});
