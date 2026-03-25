/**
 * DesignSystem / Organisms / AnalyzePanel
 *
 * Comparative analysis panel for multi-selected workout entries.
 * Currently a placeholder showing selected entry metadata — full
 * comparative visualisations are a separate in-progress effort.
 */


import type { Meta, StoryObj } from '@storybook/react';
import { AnalyzePanel } from '@/panels/analyze-panel';
import { FIXTURE_ENTRIES } from '../fixtures';

const meta: Meta<typeof AnalyzePanel> = {
  title: 'DesignSystem/Organisms/AnalyzePanel',
  component: AnalyzePanel,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="h-[600px] max-w-2xl mx-auto border border-border rounded-lg overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyComparison: Story = {
  name: 'No entries selected',
  args: { selectedEntries: [] },
};

export const SingleEntry: Story = {
  name: 'Single entry selected',
  args: { selectedEntries: [FIXTURE_ENTRIES[0]] },
};

export const TwoEntries: Story = {
  name: 'Two entries — Fran vs Cindy',
  args: { selectedEntries: [FIXTURE_ENTRIES[0], FIXTURE_ENTRIES[1]] },
};

export const AllEntries: Story = {
  name: 'All five fixture entries selected',
  args: { selectedEntries: FIXTURE_ENTRIES },
};
