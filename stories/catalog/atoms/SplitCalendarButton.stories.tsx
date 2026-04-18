/**
 * Catalog / Atoms / SplitCalendarButton
 *
 * Two-sided pill: primary action left, calendar date picker popover right.
 */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CalendarDays, Play, Search } from 'lucide-react';
import { SplitCalendarButton } from '@/components/ui/SplitCalendarButton';
import { FIXTURE_ENTRY_DATES } from '../../_shared/fixtures';
import type { INavActivation } from '@/nav/navTypes';

const meta: Meta<typeof SplitCalendarButton> = {
  title: 'catalog/atoms/SplitCalendarButton',
  component: SplitCalendarButton,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-8 space-y-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const say = (msg: string) => () => alert(msg);

const ControlledDemo = ({
  primary,
  showEntries = false,
}: {
  primary: INavActivation;
  showEntries?: boolean;
}) => {
  const [selected, setSelected] = useState<Date | null>(new Date());
  return (
    <SplitCalendarButton
      primary={primary}
      selectedDate={selected}
      onDateSelect={setSelected}
      entryDates={showEntries ? FIXTURE_ENTRY_DATES : undefined}
    />
  );
};

export const Default: Story = {
  name: 'Default',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">primary + calendar picker</p>
      <ControlledDemo
        primary={{ id: 'start', label: 'Start workout', icon: Play, action: { type: 'call', handler: say('Start workout') } }}
      />
    </div>
  ),
};

export const WithEntryDates: Story = {
  name: 'With entry dates',
  render: () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">bold dates = workout entries (from fixtures)</p>
      <ControlledDemo
        primary={{ id: 'filter', label: 'Filter by date', icon: CalendarDays, action: { type: 'call', handler: say('Filter') } }}
        showEntries
      />
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Sizes',
  render: () => {
    const [sm, setSm] = useState<Date | null>(new Date());
    const [def, setDef] = useState<Date | null>(new Date());
    const primary: INavActivation = {
      id: 'search', label: 'Browse', icon: Search,
      action: { type: 'call', handler: say('Browse') },
    };
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground font-mono">size</p>
        <div className="flex flex-col gap-3 items-start">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16">sm</span>
            <SplitCalendarButton size="sm" primary={primary} selectedDate={sm} onDateSelect={setSm} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16">default</span>
            <SplitCalendarButton primary={primary} selectedDate={def} onDateSelect={setDef} />
          </div>
        </div>
      </div>
    );
  },
};

export const NoDateSelected: Story = {
  name: 'No date selected',
  render: () => {
    const [date, setDate] = useState<Date | null>(null);
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground font-mono">no date — icon only on right half</p>
        <SplitCalendarButton
          primary={{ id: 'play', label: 'Start workout', icon: Play, action: { type: 'call', handler: say('Start') } }}
          selectedDate={date}
          onDateSelect={setDate}
        />
      </div>
    );
  },
};

