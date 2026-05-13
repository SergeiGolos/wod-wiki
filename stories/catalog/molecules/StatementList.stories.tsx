/**
 * Catalog / Molecules / StatementList
 *
 * A simple list of workout statements with line numbers and active-state highlighting.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StatementList } from '@/components/workout/StatementList';

const meta: Meta<typeof StatementList> = {
  title: 'catalog/molecules/workout/StatementList',
  component: StatementList,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof StatementList>;

const MOCK_STATEMENTS = [
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
  }
];

export const Default: Story = {
  args: {
    statements: MOCK_STATEMENTS,
  },
};

export const WithActiveItem: Story = {
  args: {
    statements: MOCK_STATEMENTS,
    activeStatementIds: new Set([2]),
  },
};

