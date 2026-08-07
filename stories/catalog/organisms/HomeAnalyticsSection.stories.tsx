/**
 * Catalog / Organisms / Home Analytics Section
 *
 * Proposal for the redesigned home-page first-scroll analytics section.
 *
 * Today the home tour's analytics stages (`analytics-scorecard` /
 * `analytics-grid` in markdown/canvas/home/README.md) render the single-workout
 * session review (AnalyticsScorecard + ReviewGrid via TourAnalyticsScreen) —
 * i.e. ONE workout's output result.
 *
 * This story proposes shifting that section's focus to *listing the elements
 * of WQL* — the query vocabulary and the presentations it drives — shown via
 * three example tiles: a table list, graphs, and a multi-query dashboard.
 * Each tile leads with the parsed WQL chips (aggregate / metric / filter /
 * group-by / rollup), not a single result number.
 *
 * The tiles compose the real leaf analytics widgets over sample QueryResult
 * data, because DashboardView executes against the live IndexedDB store
 * (empty in Storybook — see PlaygroundReview.stories). The dashboard tile
 * mirrors DashboardView's composition (buildDashboardDocument over a
 * dashboard note like markdown/dashboards/training-block-review.md).
 */
import React, { type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ParsedQuery, QueryResult } from '../../../src/services/analytics/query';
import {
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlTable,
  TopList,
  StackedBar,
} from '../../../src/components/molecules/analytics';
import { ParsedQueryChips } from '../../../src/components/organisms/analytics';
import {
  WQL_AGGREGATORS,
  WQL_METRIC_AGGREGATES,
  WQL_METRIC_FAMILIES,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
  WQL_INTENSITY_TIERS,
  WQL_ROLLUP_PERIODS,
} from '../../../src/parser/wql-vocabulary';

// ── Sample data ────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000;
const WEEK = 604_800_000;
const ts = (weeksAgo: number) => NOW - weeksAgo * WEEK;

/** Reps by effort — grouped bars → table list or bar chart. */
const repsByEffort: QueryResult = {
  parsed: {
    raw: 'sum:totalReps{} by {effort}',
    agg: 'sum',
    metric: 'totalReps',
    filters: [],
    groupBy: ['effort'],
  },
  series: [
    { key: 'thruster', label: 'Thruster', points: [{ ts: ts(0), value: 180 }] },
    { key: 'pull-up', label: 'Pull-up', points: [{ ts: ts(0), value: 120 }] },
    { key: 'burpee', label: 'Burpee', points: [{ ts: ts(0), value: 90 }] },
    { key: 'double-under', label: 'Double Under', points: [{ ts: ts(0), value: 150 }] },
    { key: 'box-jump', label: 'Box Jump', points: [{ ts: ts(0), value: 60 }] },
  ],
  stages: { selected: 5, buckets: 1, aggregated: 5, groups: 5 },
  matched: [],
};

/** Weekly tonnage — timeseries. */
const weeklyVolume: QueryResult = {
  parsed: {
    raw: 'sum:totalVolume{} by {week}.rollup(1w)',
    agg: 'sum',
    metric: 'totalVolume',
    filters: [],
    groupBy: ['week'],
    rollup: { size: 1, unit: 'w' },
  },
  series: [
    {
      key: 'totalVolume',
      label: 'Total volume',
      points: [
        { ts: ts(5), value: 3200 },
        { ts: ts(4), value: 4100 },
        { ts: ts(3), value: 3800 },
        { ts: ts(2), value: 5200 },
        { ts: ts(1), value: 4700 },
        { ts: ts(0), value: 6100 },
      ],
    },
  ],
  stages: { selected: 6, buckets: 6, aggregated: 6, groups: 1 },
  matched: [],
};

/** Load by intensity — stacked bar (3 series × 4 weeks). */
const loadByIntensity: QueryResult = {
  parsed: {
    raw: 'sum:sessionLoad{} by {intensity}.rollup(1w)',
    agg: 'sum',
    metric: 'sessionLoad',
    filters: [],
    groupBy: ['intensity'],
    rollup: { size: 1, unit: 'w' },
  },
  series: [
    {
      key: 'low',
      label: 'low',
      points: [
        { ts: ts(3), value: 120 },
        { ts: ts(2), value: 140 },
        { ts: ts(1), value: 110 },
        { ts: ts(0), value: 160 },
      ],
    },
    {
      key: 'moderate',
      label: 'moderate',
      points: [
        { ts: ts(3), value: 220 },
        { ts: ts(2), value: 200 },
        { ts: ts(1), value: 260 },
        { ts: ts(0), value: 230 },
      ],
    },
    {
      key: 'high',
      label: 'high',
      points: [
        { ts: ts(3), value: 320 },
        { ts: ts(2), value: 380 },
        { ts: ts(1), value: 340 },
        { ts: ts(0), value: 410 },
      ],
    },
  ],
  stages: { selected: 12, buckets: 4, aggregated: 12, groups: 3 },
  matched: [],
};

/** Volume by effort — toplist. */
const volumeByEffort: QueryResult = {
  parsed: {
    raw: 'sum:totalVolume{} by {effort}',
    agg: 'sum',
    metric: 'totalVolume',
    filters: [{ key: 'discipline', negate: false, values: [{ value: 'strength', wildcard: false }] }],
    groupBy: ['effort'],
  },
  series: [
    { key: 'back-squat', label: 'Back Squat', points: [{ ts: ts(0), value: 5400 }] },
    { key: 'deadlift', label: 'Deadlift', points: [{ ts: ts(0), value: 4800 }] },
    { key: 'bench-press', label: 'Bench Press', points: [{ ts: ts(0), value: 3600 }] },
    { key: 'press', label: 'Press', points: [{ ts: ts(0), value: 2900 }] },
  ],
  stages: { selected: 4, buckets: 1, aggregated: 4, groups: 4 },
  matched: [],
};

/** Avg TIS — scalar. */
const avgTis: QueryResult = {
  parsed: { raw: 'avg:tis{}', agg: 'avg', metric: 'tis', filters: [], groupBy: [] },
  series: [{ key: 'tis', label: 'TIS', points: [{ ts: ts(0), value: 7.8 }] }],
  stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
  matched: [],
  scalar: 7.8,
};

/** Total volume — scalar. */
const totalVolume: QueryResult = {
  parsed: { raw: 'sum:totalVolume{}', agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [] },
  series: [{ key: 'totalVolume', label: 'Total volume', points: [{ ts: ts(0), value: 27100 }] }],
  stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
  matched: [],
  scalar: 27100,
};

/** The WQL queries that compose the multi-query dashboard tile. */
const DASHBOARD_QUERIES = [
  'avg:tis{}',
  'sum:totalVolume{}',
  'sum:totalVolume{} by {week}.rollup(1w)',
  'sum:totalVolume{discipline:strength} by {effort}',
  'sum:sessionLoad{} by {intensity}.rollup(1w)',
];

// ── WQL elements reference strip ───────────────────────────────────────────

function VocabGroup({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <span
            key={it}
            className="font-mono text-[11px] rounded bg-muted px-1.5 py-0.5 text-foreground/80"
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function VocabularyStrip() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-border bg-card/50 p-4 md:grid-cols-3 lg:grid-cols-6">
      <VocabGroup label="aggregators" items={WQL_AGGREGATORS} />
      <VocabGroup label="metrics" items={[...WQL_METRIC_FAMILIES, ...WQL_METRIC_AGGREGATES]} />
      <VocabGroup label="filter keys" items={WQL_TAG_KEYS} />
      <VocabGroup label="dimensions" items={WQL_VIRTUAL_DIMS} />
      <VocabGroup label="intensity" items={WQL_INTENSITY_TIERS} />
      <VocabGroup label="rollups" items={WQL_ROLLUP_PERIODS} />
    </div>
  );
}

// ── Example tiles ──────────────────────────────────────────────────────────

function Tile({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
        {kind}
      </span>
      {children}
    </div>
  );
}

/** A chip row for one parsed query — the WQL elements, front and center. */
function Chips({ parsed }: { parsed: ParsedQuery }) {
  return (
    <div className="mb-2">
      <ParsedQueryChips parsed={parsed} />
    </div>
  );
}

function TableTile() {
  return (
    <Tile kind="Table list">
      <WidgetFrame
        title="Reps by effort"
        question="Which movements?"
        query="sum:totalReps{} by {effort}"
      >
        <Chips parsed={repsByEffort.parsed} />
        <div className="h-44">
          <WqlTable result={repsByEffort} unit="reps" />
        </div>
      </WidgetFrame>
    </Tile>
  );
}

function GraphsTile() {
  return (
    <Tile kind="Graphs">
      <div className="flex flex-col gap-3">
        <WidgetFrame
          title="Weekly tonnage"
          question="Is volume rising?"
          query="sum:totalVolume{} by {week}.rollup(1w)"
        >
          <Chips parsed={weeklyVolume.parsed} />
          <div className="h-40">
            <WqlTimeseries result={weeklyVolume} unit="kg" />
          </div>
        </WidgetFrame>
        <WidgetFrame
          title="Load by intensity"
          question="Is training polarized?"
          query="sum:sessionLoad{} by {intensity}.rollup(1w)"
        >
          <Chips parsed={loadByIntensity.parsed} />
          <div className="h-40">
            <StackedBar result={loadByIntensity} unit="AU" />
          </div>
        </WidgetFrame>
      </div>
    </Tile>
  );
}

function DashboardTile() {
  return (
    <Tile kind="Multi-query dashboard">
      <div className="rounded-lg border border-border bg-card/30 p-3 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Training Block Review</h3>
          <span className="text-[11px] text-muted-foreground italic text-right">
            5 WQL widgets · mirrors DashboardView
          </span>
        </div>
        {/* The composing queries — a dashboard is N WQL elements, listed. */}
        <div className="flex flex-wrap gap-1">
          {DASHBOARD_QUERIES.map((q) => (
            <span
              key={q}
              className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5 text-foreground/70 break-all"
            >
              {q}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <WidgetFrame title="Avg TIS" question="How hard?" query="avg:tis{}">
            <QueryValue result={avgTis} unit="pts" label="avg intensity" />
          </WidgetFrame>
          <WidgetFrame title="Total volume" question="How much?" query="sum:totalVolume{}">
            <QueryValue result={totalVolume} unit="kg" label="total volume" />
          </WidgetFrame>
          <div className="col-span-2">
            <WidgetFrame
              title="Weekly tonnage"
              question="Rising?"
              query="sum:totalVolume{} by {week}.rollup(1w)"
            >
              <div className="h-32">
                <WqlTimeseries result={weeklyVolume} unit="kg" />
              </div>
            </WidgetFrame>
          </div>
          <WidgetFrame
            title="Volume by effort"
            question="Where?"
            query="sum:totalVolume{discipline:strength} by {effort}"
          >
            <div className="h-32">
              <TopList result={volumeByEffort} unit="kg" limit={4} />
            </div>
          </WidgetFrame>
          <WidgetFrame
            title="Load by intensity"
            question="Polarized?"
            query="sum:sessionLoad{} by {intensity}.rollup(1w)"
          >
            <div className="h-32">
              <StackedBar result={loadByIntensity} unit="AU" />
            </div>
          </WidgetFrame>
        </div>
      </div>
    </Tile>
  );
}

// ── Full proposed section ──────────────────────────────────────────────────

function HomeAnalyticsSection() {
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
          Own the analytics
        </span>
        <h2 className="text-2xl font-bold text-foreground">
          Query what you just did — in WQL
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every result is one query away. WQL turns your journal into queryable
          facts: pick an <strong>aggregator</strong> and a <strong>metric</strong>,
          filter by <strong>tag</strong>, group by a <strong>dimension</strong>,
          roll up over <strong>time</strong>. The same elements drive a table, a
          graph, or a full dashboard.
        </p>
      </header>

      <VocabularyStrip />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <TableTile />
        <GraphsTile />
        <DashboardTile />
      </div>
    </div>
  );
}

// ── Storybook meta ─────────────────────────────────────────────────────────

const meta: Meta<typeof HomeAnalyticsSection> = {
  title: 'Organisms/Home Analytics Section',
  component: HomeAnalyticsSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Proposal for the home-page first-scroll analytics section. Replaces the ' +
          'single-workout session review with a WQL-elements showcase: a vocabulary ' +
          'reference strip plus three example presentations (table list, graphs, ' +
          'multi-query dashboard), each led by the parsed WQL chips.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof HomeAnalyticsSection>;

const Wrap: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div className="mx-auto max-w-[1500px] px-6 py-10">{children}</div>
);

export const Default: Story = {
  render: () => <HomeAnalyticsSection />,
};

export const TableList: Story = {
  render: () => (
    <Wrap>
      <TableTile />
    </Wrap>
  ),
};

export const Graphs: Story = {
  render: () => (
    <Wrap>
      <GraphsTile />
    </Wrap>
  ),
};

export const Dashboard: Story = {
  render: () => (
    <Wrap>
      <DashboardTile />
    </Wrap>
  ),
};

export const DarkTheme: Story = {
  globals: { theme: 'dark' },
  render: () => <HomeAnalyticsSection />,
};
