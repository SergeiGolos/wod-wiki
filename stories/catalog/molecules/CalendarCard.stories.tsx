/**
 * Catalog / Atoms / CalendarCard
 *
 * Various states of the CalendarCard component:
 *  - Today view with entries in the past and future
 *  - History date selected (entries present / absent)
 *  - Future date selected (entries present / absent)
 *  - Disabled with no selection
 *  - Disabled with a selection
 */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CalendarCard } from '@/components/ui/CalendarCard';

const meta: Meta<typeof CalendarCard> = {
  title: 'catalog/molecules/calendar/CalendarCard',
  component: CalendarCard,
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const today = new Date();

/** Entry dates scattered around the current month: several past, several future */
const MIXED_ENTRIES: Set<string> = new Set([
  toKey(addDays(today, -14)),
  toKey(addDays(today, -7)),
  toKey(addDays(today, -3)),
  toKey(addDays(today, -1)),
  toKey(addDays(today, 3)),
  toKey(addDays(today, 7)),
  toKey(addDays(today, 10)),
]);

/** Entry dates that include the 7-days-ago date */
const PAST_WITH_ENTRY_ON_SELECTED: Set<string> = new Set([
  toKey(addDays(today, -14)),
  toKey(addDays(today, -7)),  // ← selected date has an entry
  toKey(addDays(today, -3)),
  toKey(addDays(today, -1)),
]);

/** Entry dates that do NOT include the 10-days-ago date */
const PAST_WITHOUT_ENTRY_ON_SELECTED: Set<string> = new Set([
  toKey(addDays(today, -14)),
  toKey(addDays(today, -5)),
  toKey(addDays(today, -3)),
  toKey(addDays(today, -1)),
]);

/** Entry dates that include the 5-days-future date */
const FUTURE_WITH_ENTRY_ON_SELECTED: Set<string> = new Set([
  toKey(addDays(today, -3)),
  toKey(addDays(today, 5)),   // ← selected date has an entry
  toKey(addDays(today, 10)),
  toKey(addDays(today, 14)),
]);

/** Entry dates that do NOT include the 5-days-future date */
const FUTURE_WITHOUT_ENTRY_ON_SELECTED: Set<string> = new Set([
  toKey(addDays(today, -3)),
  toKey(addDays(today, 10)),
  toKey(addDays(today, 14)),
]);

// ── Stories ───────────────────────────────────────────────────────────────────

/**
 * Default view anchored on today. Entry dots appear on both past and future
 * dates; today is ring-highlighted. Interactable — click any date to select it.
 */
export const TodayView: Story = {
  name: 'Today — mixed past & future entries',
  render: () => {
    const [selected, setSelected] = useState<Date | null>(today);
    return (
      <div className="space-y-2">
        <div className="inline-block border border-border rounded-lg p-2 bg-card">
          <CalendarCard
            selectedDate={selected}
            onDateSelect={setSelected}
            entryDates={MIXED_ENTRIES}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Today is ring-highlighted. Bold dates have entries; selected date uses primary fill.
        </p>
      </div>
    );
  },
};

/**
 * A date 7 days in the past is selected, and that date has an entry.
 * The surrounding dates also have entry dots visible.
 */
export const HistorySelectedWithEntries: Story = {
  name: 'History selected — entry on selected date',
  render: () => {
    const [selected, setSelected] = useState<Date | null>(addDays(today, -7));
    return (
      <div className="space-y-2">
        <div className="inline-block border border-border rounded-lg p-2 bg-card">
          <CalendarCard
            selectedDate={selected}
            onDateSelect={setSelected}
            entryDates={PAST_WITH_ENTRY_ON_SELECTED}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Past date selected. The selected date also has an entry (dot hidden under primary fill).
        </p>
      </div>
    );
  },
};

/**
 * A date 10 days in the past is selected, but that date has no entry.
 * Other dates in the month still show their entry dots.
 */
export const HistorySelectedNoEntries: Story = {
  name: 'History selected — no entry on selected date',
  render: () => {
    const [selected, setSelected] = useState<Date | null>(addDays(today, -10));
    return (
      <div className="space-y-2">
        <div className="inline-block border border-border rounded-lg p-2 bg-card">
          <CalendarCard
            selectedDate={selected}
            onDateSelect={setSelected}
            entryDates={PAST_WITHOUT_ENTRY_ON_SELECTED}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Past date selected. No entry exists for the selected date; other entry dots visible nearby.
        </p>
      </div>
    );
  },
};

/**
 * A date 5 days in the future is selected, and that date has a planned entry.
 */
export const FutureSelectedWithEntries: Story = {
  name: 'Future selected — entry on selected date',
  render: () => {
    const [selected, setSelected] = useState<Date | null>(addDays(today, 5));
    return (
      <div className="space-y-2">
        <div className="inline-block border border-border rounded-lg p-2 bg-card">
          <CalendarCard
            selectedDate={selected}
            onDateSelect={setSelected}
            entryDates={FUTURE_WITH_ENTRY_ON_SELECTED}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Future date selected. The selected date has a planned entry (dot hidden under primary fill).
        </p>
      </div>
    );
  },
};

/**
 * A date 5 days in the future is selected, with no entry on that date.
 */
export const FutureSelectedNoEntries: Story = {
  name: 'Future selected — no entry on selected date',
  render: () => {
    const [selected, setSelected] = useState<Date | null>(addDays(today, 5));
    return (
      <div className="space-y-2">
        <div className="inline-block border border-border rounded-lg p-2 bg-card">
          <CalendarCard
            selectedDate={selected}
            onDateSelect={setSelected}
            entryDates={FUTURE_WITHOUT_ENTRY_ON_SELECTED}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Future date selected. No entry planned for the selected date; other entry dots visible.
        </p>
      </div>
    );
  },
};

/**
 * Disabled state with no date selected. Navigation arrows and day buttons are
 * non-interactive; the whole card is dimmed.
 */
export const DisabledNoSelection: Story = {
  name: 'Disabled — no selection',
  render: () => (
    <div className="space-y-2">
      <div className="inline-block border border-border rounded-lg p-2 bg-card">
        <CalendarCard
          selectedDate={null}
          onDateSelect={() => {}}
          entryDates={MIXED_ENTRIES}
          disabled
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Disabled, read-only. No date selected; entry dots visible but not clickable.
      </p>
    </div>
  ),
};

/**
 * Disabled state with today pre-selected. The selection is visible but the
 * card is non-interactive.
 */
export const DisabledWithSelection: Story = {
  name: 'Disabled — with selection',
  render: () => (
    <div className="space-y-2">
      <div className="inline-block border border-border rounded-lg p-2 bg-card">
        <CalendarCard
          selectedDate={today}
          onDateSelect={() => {}}
          entryDates={MIXED_ENTRIES}
          disabled
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Disabled, read-only. Today is selected (primary fill); card is non-interactive.
      </p>
    </div>
  ),
};
