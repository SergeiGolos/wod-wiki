/**
 * Catalog / Organisms / Home Analytics Section
 *
 * The home-page WQL-elements showcase (#938). Replaces the hero runway's
 * single-workout session review with a section that *lists the elements of
 * WQL* — a vocabulary reference strip plus table-list / graphs /
 * multi-query-dashboard tiles, each led by the parsed WQL chips (aggregate /
 * metric / filter / group-by / rollup), not a single result number.
 *
 * This story is a thin wrapper over the production component
 * (`playground/src/tour/HomeAnalyticsSection.tsx`), rendered with the
 * illustrative sample data because `DashboardView` executes against the live
 * IndexedDB store (empty in Storybook — see PlaygroundReview.stories). In
 * production the same section executes these queries against the store and
 * falls back per-widget to this sample when the store has no points.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  HomeAnalyticsSection,
  TableTile,
  GraphsTile,
  DashboardTile,
} from '../../../playground/src/tour/HomeAnalyticsSection';
import { SAMPLE_HOME_ANALYTICS } from '../../../playground/src/tour/homeAnalyticsData';

const meta: Meta<typeof HomeAnalyticsSection> = {
  title: 'Organisms/Home Analytics Section',
  component: HomeAnalyticsSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The home-page WQL-elements showcase (#938). Replaces the single-workout ' +
          'session review with a vocabulary reference strip plus three example ' +
          'presentations (table list, graphs, multi-query dashboard), each led by ' +
          'the parsed WQL chips. Rendered here with the illustrative sample data; ' +
          'in production the tiles execute against the live store.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

const Wrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto max-w-[1500px] px-6 py-10">{children}</div>
);

/** The full proposed section, exactly as integrated on the home page. */
export const Default: Story = {
  args: { data: SAMPLE_HOME_ANALYTICS },
};

/** One presentation: the grouped-bars query as a table list. */
export const TableList: Story = {
  render: () => (
    <Wrap>
      <TableTile data={SAMPLE_HOME_ANALYTICS} />
    </Wrap>
  ),
};

/** Two presentations: a timeseries and a stacked bar. */
export const Graphs: Story = {
  render: () => (
    <Wrap>
      <GraphsTile data={SAMPLE_HOME_ANALYTICS} />
    </Wrap>
  ),
};

/** The multi-query dashboard tile — N WQL elements, listed, mirroring DashboardView. */
export const Dashboard: Story = {
  render: () => (
    <Wrap>
      <DashboardTile data={SAMPLE_HOME_ANALYTICS} />
    </Wrap>
  ),
};

export const DarkTheme: Story = {
  globals: { theme: 'dark' },
  args: { data: SAMPLE_HOME_ANALYTICS },
};
