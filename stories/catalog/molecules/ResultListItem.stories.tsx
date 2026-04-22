/**
 * Catalog / Atoms / ResultListItem
 *
 * A workout result row: timestamp column on the left, status icon,
 * then title + optional subtitle. Used in journal day-scrolls and
 * note-editor WOD-block result lists.
 *
 * Stories:
 *  1. TitleOnly     – minimal row with just a time label and title
 *  2. WithSubtitle  – adds a secondary description line
 *  3. List          – multiple items stacked as they'd appear in a feed
 *  4. Clickable     – logs a click event via the actions panel
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ResultListItem } from '@/components/results/ResultListItem';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ResultListItem> = {
  title: 'catalog/molecules/workout/ResultListItem',
  component: ResultListItem,
  parameters: { layout: 'padded' },
  argTypes: {
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof ResultListItem>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Minimal row — time label and title only. */
export const TitleOnly: Story = {
  args: {
    timeLabel: '7:30 AM',
    title: 'Morning WOD',
  },
};

/** With secondary description line below the title. */
export const WithSubtitle: Story = {
  args: {
    timeLabel: '6:00 PM',
    title: 'CrossFit Open 24.1',
    subtitle: '21-15-9 · Thrusters + Pull-ups',
  },
};

/** Multiple items stacked as they'd appear in a journal feed. */
export const List: Story = {
  render: () => (
    <div className="w-[480px] rounded-xl border border-border overflow-hidden divide-y divide-border/40">
      <ResultListItem timeLabel="6:15 AM" title="Murph" subtitle="1 mile run · 100/200/300 · 1 mile run" />
      <ResultListItem timeLabel="12:00 PM" title="Lunchtime EMOM" subtitle="10 min · 5 burpees + 5 pull-ups" />
      <ResultListItem timeLabel="5:30 PM" title="Open 24.3" subtitle="15 min AMRAP · Chest-to-bar + Thrusters" />
      <ResultListItem timeLabel="8:00 PM" title="Gymnastics skill work" />
    </div>
  ),
};

/** Interactive — click triggers the `onClick` action in the Storybook panel. */
export const Clickable: Story = {
  args: {
    timeLabel: '9:00 AM',
    title: 'Back Squat 5×5',
    subtitle: 'Working weight: 225 lb',
    onClick: () => alert('Result selected'),
  },
};

export const LoadingResult: Story = {
  args: {
    timeLabel: '—',
    title: 'Loading workout result…',
    subtitle: 'Fetching summary from runtime',
  },
};

export const ErrorResult: Story = {
  render: () => (
    <div className="w-[480px] rounded-xl border border-destructive/40 overflow-hidden">
      <ResultListItem
        timeLabel="ERR"
        title="Failed to load result"
        subtitle="Session analytics could not be retrieved"
      />
    </div>
  ),
};

export const LongTitleTruncation: Story = {
  args: {
    timeLabel: '7:45 PM',
    title: 'Open Quarterfinal Workout 24.3 — Thrusters, Chest-to-Bar Pull-ups, and Wall Walks at Competition Pace',
    subtitle: 'Long title should truncate cleanly in narrow containers',
  },
  decorators: [
    (Story) => (
      <div className="w-[320px] rounded-xl border border-border overflow-hidden">
        <Story />
      </div>
    ),
  ],
};
