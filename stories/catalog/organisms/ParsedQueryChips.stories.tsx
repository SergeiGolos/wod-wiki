import type { Meta, StoryObj } from '@storybook/react';
import { ParsedQueryChips } from '../../../src/components/organisms/analytics/ParsedQueryChips';
import type { ParsedQuery } from '../../../src/services/analytics/query';

const meta: Meta<typeof ParsedQueryChips> = {
  title: 'Organisms/Analytics/ParsedQueryChips',
  component: ParsedQueryChips,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof meta>;

const FULL_PARSED: ParsedQuery = {
  raw: 'sum:totalVolume{discipline:strength,effort:back-squat} by {week}.rollup(1w)',
  agg: 'sum',
  metric: 'totalVolume',
  filters: [
    { key: 'discipline', negate: false, values: [{ value: 'strength', wildcard: false }] },
    { key: 'effort', negate: false, values: [{ value: 'back-squat', wildcard: false }] },
  ],
  groupBy: ['week'],
  rollup: { size: 1, unit: 'w' },
};

export const Full: Story = {
  args: { parsed: FULL_PARSED },
};

export const Bare: Story = {
  args: { parsed: { raw: 'avg:tis', agg: 'avg', metric: 'tis', filters: [], groupBy: [] } },
};

export const Error: Story = {
  args: { parsed: { raw: 'not-a-query', agg: 'sum', metric: '', filters: [], groupBy: [], error: 'Cannot parse "not-a-query".' } },
};
