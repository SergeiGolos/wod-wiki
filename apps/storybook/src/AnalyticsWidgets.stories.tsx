/**
 * Catalog / Organisms / Analytics Widgets
 *
 * Renders the WQL-driven dashboard widgets over sample QueryResult data.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { QueryResult } from '@bitcobblers/wod-wiki-engine';
import {
  WidgetFrame,
  QueryValue,
  WqlTimeseries,
  WqlBars,
  TopList,
  StackedBar,
  RangeSelector,
} from '@bitcobblers/wod-wiki-ui';

const meta: Meta = {
  title: 'Workbench/Analytics Widgets',
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

const scalarResult: QueryResult = {
  parsed: { raw: 'sum:totalVolume{}', agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [] },
  series: [{ key: 'totalVolume', label: 'totalVolume', points: [{ ts: 1_700_000_000_000, value: 6000 }] }],
  stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
  matched: [],
  scalar: 6000,
};

const barsResult: QueryResult = {
  parsed: { raw: 'sum:totalReps{} by {effort}', agg: 'sum', metric: 'totalReps', filters: [], groupBy: ['effort'] },
  series: [
    { key: 'thruster', label: 'thruster', points: [{ ts: 1_700_000_000_000, value: 120 }] },
    { key: 'pull-up', label: 'pull-up', points: [{ ts: 1_700_000_000_000, value: 80 }] },
    { key: 'burpee', label: 'burpee', points: [{ ts: 1_700_000_000_000, value: 60 }] },
  ],
  stages: { selected: 3, buckets: 1, aggregated: 3, groups: 3 },
  matched: [],
};

const timeseriesResult: QueryResult = {
  parsed: { raw: 'sum:totalVolume{} by {week}.rollup(1w)', agg: 'sum', metric: 'totalVolume', filters: [], groupBy: ['week'], rollup: { size: 1, unit: 'w' } },
  series: [
    { key: 'totalVolume', label: 'totalVolume', points: [
      { ts: 1_700_000_000_000, value: 3000 },
      { ts: 1_700_604_800_000, value: 5000 },
      { ts: 1_701_209_600_000, value: 4500 },
      { ts: 1_701_814_400_000, value: 6200 },
    ] },
  ],
  stages: { selected: 4, buckets: 4, aggregated: 4, groups: 1 },
  matched: [],
};

const stackedResult: QueryResult = {
  parsed: { raw: 'sum:sessionLoad{} by {intensity}.rollup(1w)', agg: 'sum', metric: 'sessionLoad', filters: [], groupBy: ['intensity'], rollup: { size: 1, unit: 'w' } },
  series: [
    { key: 'low', label: 'low', points: [
      { ts: 1_700_000_000_000, value: 100 },
      { ts: 1_700_604_800_000, value: 120 },
      { ts: 1_701_209_600_000, value: 90 },
    ] },
    { key: 'moderate', label: 'moderate', points: [
      { ts: 1_700_000_000_000, value: 200 },
      { ts: 1_700_604_800_000, value: 180 },
      { ts: 1_701_209_600_000, value: 220 },
    ] },
    { key: 'high', label: 'high', points: [
      { ts: 1_700_000_000_000, value: 300 },
      { ts: 1_700_604_800_000, value: 400 },
      { ts: 1_701_209_600_000, value: 350 },
    ] },
  ],
  stages: { selected: 9, buckets: 3, aggregated: 9, groups: 3 },
  matched: [],
};

const emptyResult: QueryResult = {
  parsed: { raw: 'sum:totalVolume{}', agg: 'sum', metric: 'totalVolume', filters: [], groupBy: [] },
  series: [],
  stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
  matched: [],
};

export const QueryValueWidget: Story = {
  render: () => (
    <div className="h-36">
      <WidgetFrame title="Avg TIS" question="How hard?" query="avg:tis{}">
        <QueryValue result={scalarResult} unit="pts" label="average intensity score" />
      </WidgetFrame>
    </div>
  ),
};

export const TopListWidget: Story = {
  render: () => (
    <div className="h-36">
      <WidgetFrame title="Reps by effort" question="Which moves?" query="sum:totalReps{} by {effort}">
        <TopList result={barsResult} unit="reps" limit={6} />
      </WidgetFrame>
    </div>
  ),
};

export const TimeseriesWidget: Story = {
  render: () => (
    <div className="h-56">
      <WidgetFrame title="Weekly tonnage" question="Rising?" query="sum:totalVolume{} by {week}.rollup(1w)" span="md:col-span-2">
        <WqlTimeseries result={timeseriesResult} unit="kg" />
      </WidgetFrame>
    </div>
  ),
};

export const BarWidget: Story = {
  render: () => (
    <div className="h-56">
      <WidgetFrame title="Reps by effort" question="Which moves?" query="sum:totalReps{} by {effort}">
        <WqlBars result={barsResult} unit="reps" />
      </WidgetFrame>
    </div>
  ),
};

export const StackedBarWidget: Story = {
  render: () => (
    <div className="h-56">
      <WidgetFrame title="Load by intensity" question="Polarized?" query="sum:sessionLoad{} by {intensity}.rollup(1w)">
        <StackedBar result={stackedResult} unit="AU" />
      </WidgetFrame>
    </div>
  ),
};

export const EmptyWidget: Story = {
  render: () => (
    <div className="h-36">
      <WidgetFrame title="Total volume" question="How much?" query="sum:totalVolume{}">
        <QueryValue result={emptyResult} unit="kg" label="total volume" />
      </WidgetFrame>
    </div>
  ),
};

export const RangeSelectorWidget: Story = {
  render: () => (
    <RangeSelector />
  ),
};
