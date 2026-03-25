/**
 * DesignSystem / Molecules / CalendarWidget
 *
 * Month calendar that highlights entry dates and supports range selection.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CalendarWidget } from '@/components/history/CalendarWidget';
import { FIXTURE_ENTRY_DATES } from '../fixtures';

const meta: Meta<typeof CalendarWidget> = {
  title: 'DesignSystem/Molecules/CalendarWidget',
  component: CalendarWidget,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-6 bg-background rounded-lg border border-border shadow-sm">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

// Controlled wrapper so the calendar responds to interaction in Storybook
const Controlled: React.FC<{
  initialDate?: Date;
  entryDates?: Set<string>;
  selectedDates?: Set<string>;
  compact?: boolean;
}> = ({
  initialDate = new Date(),
  entryDates = new Set<string>(),
  selectedDates = new Set<string>(),
  compact = false,
}) => {
  const [current, setCurrent] = useState(initialDate);
  return (
    <CalendarWidget
      currentDate={current}
      onDateChange={setCurrent}
      entryDates={entryDates}
      selectedDates={selectedDates}
      compact={compact}
    />
  );
};

export const EmptyMonth: Story = {
  name: 'Empty month (no entries)',
  render: () => <Controlled />,
};

export const WithEntries: Story = {
  name: 'With entry dates highlighted',
  render: () => <Controlled entryDates={FIXTURE_ENTRY_DATES} />,
};

export const WithSelection: Story = {
  name: 'With selected dates',
  render: () => {
    // Pick two dates that have entries
    const selected = new Set<string>(Array.from(FIXTURE_ENTRY_DATES).slice(0, 2));
    return <Controlled entryDates={FIXTURE_ENTRY_DATES} selectedDates={selected} />;
  },
};

export const CompactMode: Story = {
  name: 'Compact (sidebar layout)',
  render: () => <Controlled entryDates={FIXTURE_ENTRY_DATES} compact />,
};
