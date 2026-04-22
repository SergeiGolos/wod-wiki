/**
 * Catalog / Molecules / PageNavDropdown
 *
 * PageNavDropdown — a compact section-navigation dropdown used inside
 * CanvasPage and JournalPageShell. Shows the current section label and
 * lets users jump between page anchors.
 *
 * Uses IntersectionObserver when uncontrolled (activeSectionId not provided)
 * to track the visible section. In stories we pass activeSectionId directly.
 *
 * Props: links (PageNavLink[]), scrollToSection, activeSectionId?
 */

import type { Meta, StoryObj } from '@storybook/react';
import { PageNavDropdown } from '@/components/playground/PageNavDropdown';
import type { PageNavLink } from '@/components/playground/PageNavDropdown';

const noop = () => {};

const meta: Meta<typeof PageNavDropdown> = {
  title: 'catalog/molecules/PageNavDropdown',
  component: PageNavDropdown,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="flex items-center gap-4 p-8 bg-white dark:bg-zinc-900 rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const headingLinks: PageNavLink[] = [
  { id: 'intro',     label: 'Introduction' },
  { id: 'timers',    label: 'Timer Syntax' },
  { id: 'reps',      label: 'Rep Schemes' },
  { id: 'efforts',   label: 'Effort Levels' },
  { id: 'modifiers', label: 'Modifiers' },
];

export const FewItems: Story = {
  name: 'Few Items',
  render: () => (
    <PageNavDropdown
      links={headingLinks.slice(0, 3)}
      scrollToSection={noop}
      activeSectionId="timers"
    />
  ),
};

export const ManyItems: Story = {
  name: 'Many Items (scrollable)',
  render: () => (
    <PageNavDropdown
      links={[
        ...headingLinks,
        { id: 'blocks',    label: 'Block Structure' },
        { id: 'amrap',     label: 'AMRAP' },
        { id: 'emom',      label: 'EMOM' },
        { id: 'tabata',    label: 'Tabata' },
        { id: 'countdown', label: 'Countdown Timers' },
        { id: 'rounds',    label: 'Rounds' },
      ]}
      scrollToSection={noop}
      activeSectionId="amrap"
    />
  ),
};

export const ActiveItemFirst: Story = {
  name: 'Active — First Item',
  render: () => (
    <PageNavDropdown
      links={headingLinks}
      scrollToSection={noop}
      activeSectionId="intro"
    />
  ),
};

export const ActiveItemLast: Story = {
  name: 'Active — Last Item',
  render: () => (
    <PageNavDropdown
      links={headingLinks}
      scrollToSection={noop}
      activeSectionId="modifiers"
    />
  ),
};

export const WithWodItems: Story = {
  name: 'With Workout Blocks (mixed types)',
  render: () => (
    <PageNavDropdown
      links={[
        { id: 'warmup',   label: 'Warm-Up', type: 'heading' },
        { id: 'wod-1',    label: 'Fran', type: 'wod', hasResult: true },
        { id: 'wod-2',    label: 'Cindy', type: 'wod', resultCount: 3 },
        { id: 'wod-3',    label: 'Isabel', type: 'wod' },
        { id: 'cooldown', label: 'Cool-Down', type: 'heading' },
      ]}
      scrollToSection={noop}
      activeSectionId="wod-2"
    />
  ),
};

export const WithTimestamps: Story = {
  name: 'With Timestamps (journal view)',
  render: () => (
    <PageNavDropdown
      links={[
        { id: 'morning',   label: 'Morning Session',   timestamp: '06:30' },
        { id: 'noon',      label: 'Lunch Run',         timestamp: '12:15' },
        { id: 'afternoon', label: 'Afternoon Lifting',  timestamp: '16:00' },
        { id: 'evening',   label: 'Evening Yoga',      timestamp: '19:30' },
      ]}
      scrollToSection={noop}
      activeSectionId="noon"
    />
  ),
};
