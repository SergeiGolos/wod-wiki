/**
 * Catalog / Organisms / WorkoutContextPanel
 *
 * Unified component for displaying workout context in different modes:
 * - Edit: Interactive statement list with start button
 * - Run: Read-only active tracking
 * - Review: Historical data display
 */

import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutContextPanel } from '@/components/workout/WorkoutContextPanel';
import type { WodBlock } from '@/components/Editor/types';

const meta: Meta<typeof WorkoutContextPanel> = {
  title: 'catalog/organisms/workout/WorkoutContextPanel',
  component: WorkoutContextPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof WorkoutContextPanel>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_BLOCK: WodBlock = {
  id: 'mock-block',
  content: '20:00 AMRAP\n  5 Pull-ups\n  10 Push-ups\n  15 Air Squats',
  state: 'idle',
  startLine: 0,
  endLine: 4,
  version: 1,
  createdAt: Date.now(),
  widgetIds: {},
  statements: [
    {
      id: 1,
      metrics: { toArray: () => [{ type: 'time', value: '20:00' }, { type: 'text', value: 'AMRAP' }] } as any,
      meta: { line: 1 }
    },
    {
      id: 2,
      metrics: { toArray: () => [{ type: 'rep', value: 5 }, { type: 'text', value: 'Pull-ups' }] } as any,
      meta: { line: 2 }
    },
    {
      id: 3,
      metrics: { toArray: () => [{ type: 'rep', value: 10 }, { type: 'text', value: 'Push-ups' }] } as any,
      meta: { line: 3 }
    },
    {
      id: 4,
      metrics: { toArray: () => [{ type: 'rep', value: 15 }, { type: 'text', value: 'Air Squats' }] } as any,
      meta: { line: 4 }
    }
  ]
};

// ─── Stories ──────────────────────────────────────────────────────────────────

export const EditMode: Story = {
  args: {
    block: MOCK_BLOCK,
    mode: 'edit',
    showStartButton: true,
    onStart: () => alert('Starting session...'),
  },
};

export const RunMode: Story = {
  args: {
    block: { ...MOCK_BLOCK, state: 'running' },
    mode: 'run',
    activeStatementIds: new Set([2]),
  },
};

export const ReviewMode: Story = {
  args: {
    block: { ...MOCK_BLOCK, state: 'complete' },
    mode: 'review',
  },
};

export const WithErrors: Story = {
  args: {
    block: {
      ...MOCK_BLOCK,
      errors: [
        { message: 'Unknown movement "Pull-ups"', line: 2 },
        { message: 'Missing duration for AMRAP', line: 1 }
      ]
    },
    mode: 'edit',
    showErrors: true,
  },
};

export const Mobile: Story = {
  args: {
    block: MOCK_BLOCK,
    mode: 'edit',
    showStartButton: true,
    mobile: true,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
