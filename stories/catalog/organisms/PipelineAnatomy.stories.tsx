import type { Meta, StoryObj } from '@storybook/react';
import { PipelineAnatomy } from '../../../src/components/organisms/analytics/PipelineAnatomy';
import type { ParsedQuery, QueryResult } from '../../../src/services/analytics/query';

const meta: Meta<typeof PipelineAnatomy> = {
  title: 'Organisms/Analytics/PipelineAnatomy',
  component: PipelineAnatomy,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof meta>;

function makeParsed(overrides?: Partial<ParsedQuery>): ParsedQuery {
  return {
    raw: 'sum:totalVolume{discipline:strength} by {week}.rollup(1w)',
    agg: 'sum',
    metric: 'totalVolume',
    filters: [{ key: 'discipline', negate: false, values: [{ value: 'strength', wildcard: false }] }],
    groupBy: ['week'],
    rollup: { size: 1, unit: 'w' },
    ...overrides,
  };
}

function makeResult(parsed: ParsedQuery, stages: QueryResult['stages']): QueryResult {
  return { parsed, series: [], stages, matched: [] };
}

export const WeeklyRollup: Story = {
  args: {
    result: makeResult(makeParsed(), { selected: 128, buckets: 8, aggregated: 8, groups: 1 }),
  },
};

export const ByEffort: Story = {
  args: {
    result: makeResult(
      makeParsed({ groupBy: ['effort'], rollup: undefined }),
      { selected: 64, buckets: 1, aggregated: 12, groups: 12 },
    ),
  },
};

export const Errored: Story = {
  args: {
    result: makeResult(
      makeParsed({ error: 'Cannot parse query.', metric: '', groupBy: [], rollup: undefined, filters: [] }),
      { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
    ),
  },
};
