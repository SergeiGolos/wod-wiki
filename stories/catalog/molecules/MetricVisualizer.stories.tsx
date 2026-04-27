/**
 * Catalog / Atoms / MetricVisualizer
 *
 * Renders an inline row of MetricPill badges, grouped and color-coded
 * by MetricType. This is the canonical way to display a set of metrics
 * for any statement or runtime block across all panels.
 *
 * Stories:
 *  1. Empty       – no metrics (renders nothing)
 *  2. SingleType  – one metric type
 *  3. MixedTypes  – representative cross-section of types
 *  4. SizeVariants – normal / compact / large side-by-side
 *  5. WithFilter   – typeOverrides hide specific types
 *  6. ErrorState   – error prop displayed instead of metrics
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MetricVisualizer } from '@/views/runtime/MetricVisualizer';
import type { IMetric } from '@/core/models/Metric';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function m(type: string, value: unknown, origin: IMetric['origin'] = 'parser'): IMetric {
  return { type, value, origin } as IMetric;
}

const SAMPLE_METRICS: IMetric[] = [
  m('rounds',   3),
  m('time',     300_000),
  m('rep',      21),
  m('action',   'Thruster'),
  m('resistance', '95lb'),
];

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
    <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
    <div>{children}</div>
  </div>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof MetricVisualizer> = {
  title: 'catalog/molecules/metrics/MetricVisualizer',
  component: MetricVisualizer,
  parameters: { layout: 'padded', subsystem: 'chromecast' },
};

export default meta;
type Story = StoryObj<typeof MetricVisualizer>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Empty array renders nothing (null output). */
export const Empty: Story = {
  args: { metrics: [] },
};

/** Single metric type. */
export const SingleType: Story = {
  args: { metrics: [m('rep', 21)] },
};

/** Cross-section of common metric types. */
export const MixedTypes: Story = {
  args: { metrics: SAMPLE_METRICS },
};

/** Three size variants stacked for comparison. */
export const SizeVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-0 w-fit">
      <Row label="focused">  <MetricVisualizer metrics={SAMPLE_METRICS} size="focused" /></Row>
      <Row label="normal">  <MetricVisualizer metrics={SAMPLE_METRICS} size="normal" /></Row>
      <Row label="compact"> <MetricVisualizer metrics={SAMPLE_METRICS} size="compact" /></Row>
    </div>
  ),
};

/** Filter hides types not in the allowed list. */
export const WithFilter: Story = {
  render: () => (
    <div className="flex flex-col gap-0 w-fit">
      <Row label="unfiltered">
        <MetricVisualizer metrics={SAMPLE_METRICS} />
      </Row>
      <Row label="reps only">
        <MetricVisualizer
          metrics={SAMPLE_METRICS}
          filter={{ typeOverrides: { rounds: false, time: false, action: false, resistance: false } }}
        />
      </Row>
      <Row label="time + reps">
        <MetricVisualizer
          metrics={SAMPLE_METRICS}
          filter={{ typeOverrides: { rounds: false, action: false, resistance: false } }}
        />
      </Row>
    </div>
  ),
};

/** Error state renders an error badge instead of metric pills. */
export const ErrorState: Story = {
  args: {
    metrics: [],
    error: { message: 'Failed to parse statement', line: 3, column: 7 },
  },
};

/**
 * UX-04: Rest blocks must be visually distinct from work sets.
 *
 * "Rest" is parsed as an `effort` metric whose value is the literal word
 * "Rest". The visualizer detects this and renders the rest icon (⏸️) with
 * muted styling rather than the running figure (🏃) used for work sets.
 */
export const RestVsWorkSet: Story = {
  render: () => (
    <div className="flex flex-col gap-0 w-fit">
      <Row label="work set">
        <MetricVisualizer metrics={[m('rep', 10), m('effort', 'Pushups')]} />
      </Row>
      <Row label="rest block">
        <MetricVisualizer metrics={[m('time', 90_000), m('effort', 'Rest')]} />
      </Row>
      <Row label="work set">
        <MetricVisualizer metrics={[m('rep', 20), m('effort', 'Squats')]} />
      </Row>
    </div>
  ),
};
