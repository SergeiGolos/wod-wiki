import type { Meta, StoryObj } from '@storybook/react';
import ParsedView from '../src/components/ParsedView';

const meta: Meta<typeof ParsedView> = {
  title: 'Components/ParsedView',
  component: ParsedView,
  parameters: {
    layout: 'centered',
  },

  argTypes: {
    wodscript: { control: 'text' },
    activeStatementIds: { control: 'object' },
    selectedStatementId: { control: 'number' },
    onSelectionChange: { action: 'selectionChanged' },
  },
};

export default meta;
type Story = StoryObj<typeof ParsedView>;

const sampleScript = `10:00 Timer
  + 10 Pushups
  + 10 Situps
  + 10 Squats`;

export const Default: Story = {
  args: {
    wodscript: sampleScript,
  },
};

export const WithSelection: Story = {
  args: {
    wodscript: sampleScript,
    selectedStatementId: 3, // Assuming line 3 corresponds to Pushups
  },
};

export const WithRuntimeActive: Story = {
  args: {
    wodscript: sampleScript,
    activeStatementIds: [4], // Assuming line 4 corresponds to Situps
  },
};

export const MultipleActive: Story = {
  args: {
    wodscript: sampleScript,
    activeStatementIds: [3, 4, 5], // Highlight multiple lines
  },
};

export const Interactive: Story = {
  args: {
    wodscript: sampleScript,
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [selected, setSelected] = React.useState<number | null>(null);
    return <ParsedView {...args} selectedStatementId={selected} onSelectionChange={setSelected} />;
  }
}
import React from 'react';
