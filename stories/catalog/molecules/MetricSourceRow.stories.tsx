/**
 * Catalog / Atoms / MetricSourceRow
 *
 * A runtime-block row component driven by IMetricSource or a plain metrics
 * array. Used in timer panels, editor overlays, and analytics views.
 *
 * Stories:
 *  1. StatusVariants  – pending / active / completed / failed side-by-side
 *  2. NestedDepths    – depth 0 / 1 / 2 with indentation
 *  3. LeafVsNonLeaf   – leaf (bold) vs. parent (normal weight)
 *  4. HeaderRow       – section header styling
 *  5. MultiGroup      – multi-group metrics (linked + statements)
 *  6. WithDuration    – shows optional duration column on the right
 *  7. EmptyFallback   – no metrics, shows label fallback
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import MetricSourceRow from '@/components/metrics/MetricSourceRow';
import type { IMetric } from '@/core/models/Metric';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function m(type: string, value: unknown): IMetric {
  return { type, value, origin: 'parser' } as IMetric;
}

const AMRAP: IMetric[] = [m('rounds', 3), m('time', 1200_000)];
const SQUAT: IMetric[] = [m('rep', 5), m('resistance', '225lb'), m('action', 'Back Squat')];
const RUN:   IMetric[] = [m('distance', 400), m('time', 90_000), m('action', 'Run')];

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-[520px] border border-border rounded overflow-hidden">
    {children}
  </div>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof MetricSourceRow> = {
  title: 'catalog/molecules/metrics/MetricSourceRow',
  component: MetricSourceRow,
  parameters: { layout: 'padded', subsystem: 'chromecast' },
};

export default meta;
type Story = StoryObj<typeof MetricSourceRow>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** All four execution statuses stacked. */
export const StatusVariants: Story = {
  render: () => (
    <Shell>
      <MetricSourceRow metrics={RUN}   status="pending"   label="pending" />
      <MetricSourceRow metrics={AMRAP} status="active"    label="active" />
      <MetricSourceRow metrics={SQUAT} status="completed" label="completed" />
      <MetricSourceRow metrics={RUN}   status="failed"    label="failed" />
    </Shell>
  ),
};

/** Depth-based indentation (0 → 1 → 2). */
export const NestedDepths: Story = {
  render: () => (
    <Shell>
      <MetricSourceRow metrics={[m('text', 'Session')]} depth={0} status="active" label="depth 0" />
      <MetricSourceRow metrics={AMRAP}                  depth={1} status="active" label="depth 1" />
      <MetricSourceRow metrics={SQUAT}                  depth={2} status="active" label="depth 2" isLeaf />
      <MetricSourceRow metrics={RUN}                    depth={2} status="pending" label="depth 2" />
    </Shell>
  ),
};

/** Leaf rows are bold; non-leaf rows use normal weight. */
export const LeafVsNonLeaf: Story = {
  render: () => (
    <Shell>
      <MetricSourceRow metrics={AMRAP} isLeaf={false} label="parent block" status="active" />
      <MetricSourceRow metrics={SQUAT} isLeaf         label="leaf block"   status="active" depth={1} />
    </Shell>
  ),
};

/** Section header styling (background tint + bold). */
export const HeaderRow: Story = {
  render: () => (
    <Shell>
      <MetricSourceRow label="Round 1" isHeader status="active" metrics={[]} />
      <MetricSourceRow metrics={SQUAT} depth={1} status="completed" />
      <MetricSourceRow metrics={RUN}   depth={1} status="completed" />
      <MetricSourceRow label="Round 2" isHeader status="active" metrics={[]} />
      <MetricSourceRow metrics={SQUAT} depth={1} status="active" isLeaf />
    </Shell>
  ),
};

/** Multi-group metrics (two linked statements share one row). */
export const MultiGroup: Story = {
  render: () => (
    <Shell>
      <MetricSourceRow
        status="active"
        isLeaf
        metricGroups={[SQUAT, RUN]}
      />
    </Shell>
  ),
};

/** Duration column appears when showDuration + duration are provided. */
export const WithDuration: Story = {
  render: () => (
    <Shell>
      <MetricSourceRow metrics={RUN}   status="completed" showDuration duration={93_000} />
      <MetricSourceRow metrics={SQUAT} status="completed" showDuration duration={210_000} />
      <MetricSourceRow metrics={AMRAP} status="active"    showDuration duration={0} isLeaf />
    </Shell>
  ),
};

/** No metrics — falls back to displaying the label prop. */
export const EmptyFallback: Story = {
  render: () => (
    <Shell>
      <MetricSourceRow metrics={[]} label="No metrics yet" status="pending" />
      <MetricSourceRow status="pending" />
    </Shell>
  ),
};
