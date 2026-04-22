/**
 * Catalog / Atoms / StatementDisplay
 *
 * Three closely-related display atoms from src/components/metrics/StatementDisplay.tsx:
 *
 *  StatementDisplay  – a workout statement row with inline MetricVisualizer
 *  BlockDisplay      – a runtime block row with status dot, label, metrics
 *  MetricList        – bare MetricVisualizer wrapper (no row chrome)
 *
 * Stories:
 *  StatementDisplay
 *    1. Default       – inactive statement
 *    2. Active        – highlighted active state
 *    3. Compact       – reduced padding
 *    4. Grouped       – no outer border (nested in a group)
 *    5. WithActions   – trailing action buttons
 *  BlockDisplay
 *    6. AllStatuses   – pending / active / running / complete side-by-side
 *    7. NestedDepths  – depth 0 / 1 / 2 indentation
 *  MetricList
 *    8. Inline        – bare metric tags with no row wrapper
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  StatementDisplay,
  BlockDisplay,
  MetricList,
} from '@/components/metrics/StatementDisplay';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import type { IMetric } from '@/core/models/Metric';
import { Button } from '@/components/ui/button';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function m(type: string, value: unknown): IMetric {
  return { type, value, origin: 'parser' } as IMetric;
}

function makeStatement(metrics: IMetric[]): ICodeStatement {
  return {
    id: 1,
    parent: undefined,
    children: [],
    metrics,
    isLeaf: true,
    meta: {} as ICodeStatement['meta'],
    metricMeta: new Map(),
  };
}

const AMRAP_METRICS = [m('rounds', 3), m('time', 1200_000)];
const LIFT_METRICS  = [m('rep', 5), m('resistance', '225lb'), m('action', 'Back Squat')];
const RUN_METRICS   = [m('distance', 400), m('time', 90_000), m('action', 'Run')];

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-6">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
    {children}
  </div>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'catalog/molecules/StatementDisplay',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

// ─── StatementDisplay stories ─────────────────────────────────────────────────

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-2 w-[480px]">
      <StatementDisplay statement={makeStatement(AMRAP_METRICS)} />
      <StatementDisplay statement={makeStatement(LIFT_METRICS)} />
      <StatementDisplay statement={makeStatement(RUN_METRICS)} />
    </div>
  ),
};

export const Active: Story = {
  render: () => (
    <div className="flex flex-col gap-2 w-[480px]">
      <StatementDisplay statement={makeStatement(AMRAP_METRICS)} isActive />
      <StatementDisplay statement={makeStatement(LIFT_METRICS)} />
    </div>
  ),
};

export const Compact: Story = {
  render: () => (
    <div className="flex flex-col gap-0.5 w-[480px]">
      <StatementDisplay statement={makeStatement(AMRAP_METRICS)} compact />
      <StatementDisplay statement={makeStatement(LIFT_METRICS)} compact isActive />
      <StatementDisplay statement={makeStatement(RUN_METRICS)} compact />
    </div>
  ),
};

export const Grouped: Story = {
  render: () => (
    <div className="w-[480px] border border-border rounded overflow-hidden">
      <StatementDisplay statement={makeStatement(AMRAP_METRICS)} isGrouped />
      <StatementDisplay statement={makeStatement(LIFT_METRICS)} isGrouped isActive />
      <StatementDisplay statement={makeStatement(RUN_METRICS)} isGrouped />
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <StatementDisplay
      statement={makeStatement(LIFT_METRICS)}
      actions={
        <>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">Edit</Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive">Delete</Button>
        </>
      }
    />
  ),
};

// ─── BlockDisplay stories ─────────────────────────────────────────────────────

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col w-[480px] border border-border rounded overflow-hidden">
      <BlockDisplay label="Warm-up"   blockType="timer"  metrics={RUN_METRICS}   status="complete" />
      <BlockDisplay label="Main AMRAP" blockType="rounds" metrics={AMRAP_METRICS}  status="active" />
      <BlockDisplay label="Cool-down" blockType="timer"  metrics={RUN_METRICS}   status="running" />
      <BlockDisplay label="Stretch"   blockType="effort" status="pending" />
    </div>
  ),
};

export const NestedDepths: Story = {
  render: () => (
    <div className="flex flex-col w-[480px] border border-border rounded overflow-hidden">
      <BlockDisplay label="Session"     blockType="session" depth={0} status="active" />
      <BlockDisplay label="AMRAP 20:00" blockType="rounds"  depth={1} metrics={AMRAP_METRICS} status="active" />
      <BlockDisplay label="Thruster 21" blockType="effort"  depth={2} metrics={LIFT_METRICS}  status="complete" />
      <BlockDisplay label="Pull-up 21"  blockType="effort"  depth={2} metrics={[m('rep', 21), m('action', 'Pull-up')]} status="running" />
    </div>
  ),
};

// ─── MetricList ───────────────────────────────────────────────────────────────

export const Inline: Story = {
  render: () => (
    <Section label="MetricList — bare metric tags">
      <div className="flex flex-col gap-2">
        <MetricList metrics={AMRAP_METRICS} />
        <MetricList metrics={LIFT_METRICS} />
        <MetricList metrics={RUN_METRICS} compact />
      </div>
    </Section>
  ),
};
