/**
 * Catalog / Atoms / CalendarButton
 *
 * Single button with a calendar icon that opens a CalendarCard popover.
 * States: no selection, date selected, with entry dots, disabled, sizes.
 */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CalendarButton } from '@/components/ui/CalendarButton';
import { FIXTURE_ENTRY_DATES } from '../../_shared/fixtures';

const meta: Meta<typeof CalendarButton> = {
  title: 'catalog/molecules/calendar/CalendarButton',
  component: CalendarButton,
  parameters: { layout: 'centered', subsystem: 'workbench' },
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

export const NoSelection: Story = {
  name: 'No date selected',
  render: () => {
    const [date, setDate] = useState<Date | null>(null);
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-mono">no selection — icon only</p>
        <CalendarButton selectedDate={date} onDateSelect={setDate} />
      </div>
    );
  },
};

export const WithSelection: Story = {
  name: 'Date selected',
  render: () => {
    const [date, setDate] = useState<Date | null>(new Date());
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-mono">date selected — label shown in primary colour</p>
        <CalendarButton selectedDate={date} onDateSelect={setDate} />
      </div>
    );
  },
};

export const WithEntryDates: Story = {
  name: 'With entry dates',
  render: () => {
    const [date, setDate] = useState<Date | null>(new Date());
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-mono">entry dots visible on calendar open</p>
        <CalendarButton selectedDate={date} onDateSelect={setDate} entryDates={FIXTURE_ENTRY_DATES} />
      </div>
    );
  },
};

export const Sizes: Story = {
  name: 'Sizes',
  render: () => {
    const [sm, setSm] = useState<Date | null>(new Date());
    const [def, setDef] = useState<Date | null>(new Date());
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground font-mono">size variants</p>
        <div className="flex flex-col gap-3 items-start">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16">sm</span>
            <CalendarButton size="sm" selectedDate={sm} onDateSelect={setSm} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16">default</span>
            <CalendarButton selectedDate={def} onDateSelect={setDef} />
          </div>
        </div>
      </div>
    );
  },
};

export const EdgeCollision: Story = {
  name: 'Edge collision — align flips',
  parameters: { layout: 'fullscreen' },
  render: () => {
    const [left, setLeft] = useState<Date | null>(new Date());
    const [right, setRight] = useState<Date | null>(new Date());
    return (
      <div className="relative w-full h-40">
        <p className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-mono">
          left button → calendar opens right · right button → calendar opens left
        </p>
        {/* Button pinned to left edge */}
        <div className="absolute left-2 bottom-4">
          <CalendarButton selectedDate={left} onDateSelect={setLeft} />
        </div>
        {/* Button pinned to right edge */}
        <div className="absolute right-2 bottom-4">
          <CalendarButton selectedDate={right} onDateSelect={setRight} />
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-mono">disabled — non-interactive, dimmed</p>
      <div className="flex flex-col gap-3 items-start">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-24">no selection</span>
          <CalendarButton selectedDate={null} onDateSelect={() => {}} disabled />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-24">with selection</span>
          <CalendarButton selectedDate={new Date()} onDateSelect={() => {}} disabled />
        </div>
      </div>
    </div>
  ),
};
