/**
 * CalendarPageShell Stories
 *
 * Demonstrates the CalendarPageShell with month and week (mobile) views.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { CalendarPageShell } from '@/panels/page-shells/CalendarPageShell';
import { Edit, BarChart2, Eye } from 'lucide-react';
import React from 'react';

const meta: Meta<typeof CalendarPageShell> = {
  title: 'catalog/pages/Calendar',
  component: CalendarPageShell,
  parameters: {
    layout: 'fullscreen',
    subsystem: 'workbench',
    docs: {
      description: {
        component:
          'Layout shell for calendar / collection pages. Sidebar calendar with tabbed detail area. Mobile: collapses to compact week-strip.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Calendar grid mock for story states; highlightedDays are 1-based day numbers. */
function MockCalendar({
  highlightedDays = [21],
  monthLabel = 'March 2026',
}: {
  highlightedDays?: number[];
  monthLabel?: string;
}) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
        {monthLabel}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="font-bold text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {Array.from({ length: 31 }, (_, i) => (
          <button
            key={i}
            className={`py-1 rounded-md text-foreground hover:bg-muted/60 ${
              highlightedDays.includes(i + 1)
                ? 'bg-primary text-primary-foreground font-bold'
                : ''
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: React.createElement(Eye, { className: 'w-4 h-4' }),
    content: (
      <div className="p-6 space-y-4">
        <h2 className="text-xl font-black text-foreground uppercase">
          March 21, 2026
        </h2>
        <p className="text-muted-foreground">
          No workouts logged for this date.
        </p>
      </div>
    ),
  },
  {
    id: 'editor',
    label: 'Editor',
    icon: React.createElement(Edit, { className: 'w-4 h-4' }),
    content: (
      <div className="p-6 space-y-4">
        <h2 className="text-xl font-black text-foreground uppercase">
          Plan Workout
        </h2>
        <div className="bg-muted/20 border border-border/50 rounded-lg p-4 text-sm font-mono text-muted-foreground">
          {`\`\`\`wod\n5x5 Back Squat 225 lb\n3x10 Romanian Deadlift 135 lb\n\`\`\``}
        </div>
      </div>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: React.createElement(BarChart2, { className: 'w-4 h-4' }),
    content: (
      <div className="p-6 space-y-4">
        <h2 className="text-xl font-black text-foreground uppercase">
          Analytics
        </h2>
        <p className="text-muted-foreground">
          Comparative analysis coming soon.
        </p>
      </div>
    ),
  },
];

/**
 * Month view — desktop layout with full calendar sidebar.
 */
export const MonthView: Story = {
  render: () => (
    <CalendarPageShell
      calendar={<MockCalendar highlightedDays={[21]} />}
      tabs={TABS}
      defaultTab="overview"
    />
  ),
};

/**
 * Week view (mobile) — resize the viewport to see the compact layout.
 */
export const WeekView: Story = {
  render: () => (
    <CalendarPageShell
      calendar={<MockCalendar highlightedDays={[12]} />}
      tabs={TABS}
      defaultTab="editor"
    />
  ),
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const EmptyCalendar: Story = {
  render: () => (
    <CalendarPageShell
      calendar={<MockCalendar highlightedDays={[]} />}
      tabs={[
        {
          ...TABS[0],
          content: (
            <div className="p-6">
              <h2 className="text-xl font-black text-foreground uppercase">No Entries</h2>
              <p className="text-muted-foreground mt-2">No workouts logged for this month.</p>
            </div>
          ),
        },
      ]}
      defaultTab="overview"
    />
  ),
};

export const SingleEntry: Story = {
  render: () => (
    <CalendarPageShell
      calendar={<MockCalendar highlightedDays={[7]} />}
      tabs={[
        {
          ...TABS[0],
          content: (
            <div className="p-6 space-y-3">
              <h2 className="text-xl font-black text-foreground uppercase">March 7, 2026</h2>
              <p className="text-sm text-muted-foreground">1 workout entry</p>
              <div className="rounded-lg border border-border p-3 text-sm">
                Fran — 21-15-9 Thrusters / Pull-ups
              </div>
            </div>
          ),
        },
      ]}
      defaultTab="overview"
    />
  ),
};

export const ManyEntries: Story = {
  render: () => (
    <CalendarPageShell
      calendar={<MockCalendar highlightedDays={[1, 2, 3, 5, 8, 13, 14, 17, 21, 22, 24, 28, 30]} />}
      tabs={TABS}
      defaultTab="analytics"
    />
  ),
};

export const NavigationEdgeCases: Story = {
  render: () => (
    <CalendarPageShell
      calendar={
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button className="text-xs text-muted-foreground opacity-50 cursor-not-allowed" disabled>
              ← Prev
            </button>
            <h3 className="text-sm font-black uppercase">February 2024</h3>
            <button className="text-xs text-primary">Next →</button>
          </div>
          <MockCalendar highlightedDays={[1, 29]} monthLabel="February 2024" />
        </div>
      }
      tabs={[
        {
          ...TABS[0],
          content: (
            <div className="p-6 text-sm text-muted-foreground">
              Leap-year month boundary with first-day and last-day entries.
            </div>
          ),
        },
      ]}
      defaultTab="overview"
    />
  ),
};
