/**
 * Catalog / Organisms / WqlQueryField
 *
 * Renders: {@link import('../../../src/components/organisms/editor/WqlQueryField').WqlQueryField}
 *
 * The WQL query field (wayfinder #730) — single-line CodeMirror with Lezer
 * highlighting and autocomplete over the analytics dictionary.
 *
 * Stories:
 *  1. Empty — placeholder shows the query shape; type to trigger completion
 *  2. Prefilled — a full query with filters, group-by, and rollup
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WqlQueryField } from '../../../src/components/organisms/editor/WqlQueryField';

/** Effort slugs a real mount feeds from the EffortResolver. */
const DEMO_EFFORTS = [
  'thruster', 'pull-up', 'back-squat', 'rowing', 'double-under',
  'burpee', 'snatch', 'clean-and-jerk', 'wall-ball', 'box-jump',
];

const meta: Meta<typeof WqlQueryField> = {
  title: 'Organisms/WqlQueryField',
  component: WqlQueryField,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof WqlQueryField>;

const FieldHarness: React.FC<{ initialValue: string }> = ({ initialValue }) => {
  const [value, setValue] = useState(initialValue);
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <div className="max-w-xl space-y-3">
      <WqlQueryField
        value={value}
        onChange={setValue}
        onSubmit={setSubmitted}
        effortNames={() => DEMO_EFFORTS}
        autoFocus
      />
      <div className="text-xs text-muted-foreground font-mono break-all">
        value: {value || '(empty)'}
      </div>
      {submitted !== null && (
        <div className="text-xs text-green-600 font-mono">submitted: {submitted}</div>
      )}
    </div>
  );
};

export const Empty: Story = {
  render: () => <FieldHarness initialValue="" />,
};

export const Prefilled: Story = {
  render: () => (
    <FieldHarness initialValue="sum:totalVolume{discipline:strength,!effort:burpee} by {week}.rollup(1w)" />
  ),
};
