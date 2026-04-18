/**
 * Catalog / Atoms / CalendarDatePicker
 *
 * Date picker with entry-date highlighting from fixture data.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { FIXTURE_ENTRY_DATES } from '../../_shared/fixtures';

const meta: Meta<typeof CalendarDatePicker> = {
  title: 'catalog/atoms/CalendarDatePicker',
  component: CalendarDatePicker,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-6 bg-background rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const CalendarDemo: React.FC = () => {
  const [selected, setSelected] = useState<Date | null>(new Date());
  return (
    <div className="space-y-2">
      <div className="inline-block border border-border rounded-lg p-2 bg-card">
        <CalendarDatePicker
          selectedDate={selected}
          onDateSelect={setSelected}
          entryDates={FIXTURE_ENTRY_DATES}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Bold dates have entries (from fixtures). Selected date highlighted in primary.
      </p>
    </div>
  );
};

export const Default: Story = {
  name: 'CalendarDatePicker',
  render: () => <CalendarDemo />,
};
