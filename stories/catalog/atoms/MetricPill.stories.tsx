/**
 * Catalog / Atoms / MetricPill
 *
 * The color-coded badge that represents a single workout metric.
 * Color is driven by MetricType; user-origin metrics get a dashed
 * border, italic text, and a `(u)` suffix.
 *
 * Stories:
 *  1. AllTypes        – one pill per MetricType side-by-side
 *  2. UserOrigin      – system vs user-override comparison
 *  3. TimeDuration    – time-based metrics use smart duration formatting
 *  4. WithComplexValue – object values (CurrentRound, Text)
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MetricPill } from '@/components/review-grid/MetricPill';
import type { IMetric } from '@/core/models/Metric';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function metric(type: string, value: unknown, origin: IMetric['origin'] = 'parser'): IMetric {
  return { type, value, origin } as IMetric;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
    <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof MetricPill> = {
  title: 'catalog/atoms/MetricPill',
  component: MetricPill,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof MetricPill>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** One pill per MetricType — shows the full color palette. */
export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-0 w-fit">
      <Row label="time">        <MetricPill metric={metric('time',       300_000)} /></Row>
      <Row label="rep">         <MetricPill metric={metric('rep',        15)} /></Row>
      <Row label="effort">      <MetricPill metric={metric('effort',     'Moderate')} /></Row>
      <Row label="distance">    <MetricPill metric={metric('distance',   400)} /></Row>
      <Row label="rounds">      <MetricPill metric={metric('rounds',     3)} /></Row>
      <Row label="action">      <MetricPill metric={metric('action',     'Run')} /></Row>
      <Row label="resistance">  <MetricPill metric={metric('resistance', '95lb')} /></Row>
      <Row label="duration">    <MetricPill metric={metric('duration',   600_000)} /></Row>
      <Row label="elapsed">     <MetricPill metric={metric('elapsed',    182_000)} /></Row>
      <Row label="total">       <MetricPill metric={metric('total',      900_000)} /></Row>
      <Row label="increment">   <MetricPill metric={metric('increment',  5)} /></Row>
      <Row label="text">        <MetricPill metric={metric('text',       'AMRAP')} /></Row>
      <Row label="lap">         <MetricPill metric={metric('lap',        1)} /></Row>
    </div>
  ),
};

/** System-origin vs user-override — dashed border + `(u)` suffix for user origin. */
export const UserOrigin: Story = {
  render: () => (
    <div className="flex flex-col gap-0 w-fit">
      <Row label="rep (system)">  <MetricPill metric={metric('rep', 10, 'parser')} /></Row>
      <Row label="rep (user)">    <MetricPill metric={metric('rep', 8,  'user')} /></Row>
      <Row label="time (system)"> <MetricPill metric={metric('time', 300_000, 'parser')} /></Row>
      <Row label="time (user)">   <MetricPill metric={metric('time', 285_000, 'user')} /></Row>
    </div>
  ),
};

/** Time-based metrics format values using smart duration display. */
export const TimeDuration: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-2">
      <MetricPill metric={metric('time',     30_000)} />
      <MetricPill metric={metric('time',     90_000)} />
      <MetricPill metric={metric('time',     300_000)} />
      <MetricPill metric={metric('time',     3_661_000)} />
      <MetricPill metric={metric('duration', 600_000)} />
      <MetricPill metric={metric('elapsed',  182_500)} />
      <MetricPill metric={metric('total',    905_000)} />
    </div>
  ),
};

/** Complex object values — CurrentRound and Text metric shapes. */
export const WithComplexValue: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-2">
      <MetricPill metric={metric('rounds', { current: 2, total: 5 })} />
      <MetricPill metric={metric('text',   { text: 'Tabata', role: 'label' })} />
      <MetricPill metric={metric('action', { text: 'Squat' })} />
    </div>
  ),
};
