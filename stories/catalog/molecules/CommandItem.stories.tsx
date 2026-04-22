/**
 * Catalog / Atoms / CommandItem
 *
 * The individual building blocks that make up a command-palette result list:
 *  – CommandGroupHeading  – uppercase section label
 *  – CommandItem (DefaultListItem) – single interactive row
 *  – ShortcutBadge        – keyboard shortcut tokens
 *  – CommandEmptyState    – "No results" fallback
 *
 * Stories:
 *  1. BasicItem       – label-only row
 *  2. WithShortcut    – item with keyboard shortcut badges
 *  3. WithIcon        – item with leading icon
 *  4. WithSubtitle    – item with secondary description line
 *  5. States          – default / active / selected / disabled side-by-side
 *  6. GroupHeading    – section divider label
 *  7. GroupedItems    – heading + items composited
 *  8. EmptyState      – "No results found" fallback
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DefaultListItem } from '@/components/list/DefaultListItem';
import type { IListItem, ListItemContext } from '@/components/list/types';
import { Dumbbell, Calendar, BookOpen, Play, Copy } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<ListItemContext> = {}): ListItemContext {
  return {
    isSelected: false,
    isActive: false,
    depth: 0,
    actions: [],
    onSelect: () => {},
    executeAction: () => {},
    ...overrides,
  };
}

function makeItem<T = { action: string }>(
  overrides: Partial<IListItem<T>> & { payload?: T },
): IListItem<T> {
  return {
    id: 'item-1',
    label: 'Go to Notebook',
    payload: (overrides.payload ?? { action: 'nav' }) as T,
    ...overrides,
  };
}

const PaletteShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-[480px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden p-1">
    {children}
  </div>
);

const GroupHeading: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
    {label}
  </div>
);

const EmptyState: React.FC<{ message?: string }> = ({ message = 'No results found.' }) => (
  <div className="py-8 text-center text-sm text-zinc-400">{message}</div>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'catalog/molecules/commands/CommandItem',
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

// ─── Stories ─────────────────────────────────────────────────────────────────

export const BasicItem: Story = {
  name: 'Basic Item',
  render: () => (
    <PaletteShell>
      <DefaultListItem item={makeItem({ label: 'Go to Notebook' })} ctx={makeCtx()} />
    </PaletteShell>
  ),
};

export const WithShortcut: Story = {
  name: 'With Shortcut',
  render: () => (
    <PaletteShell>
      <DefaultListItem item={makeItem({ label: 'Go to Notebook', shortcut: ['g', 'n'] })} ctx={makeCtx()} />
      <DefaultListItem item={makeItem({ id: 'i2', label: 'Go to Playground', shortcut: ['g', 'h'] })} ctx={makeCtx()} />
      <DefaultListItem item={makeItem({ id: 'i3', label: 'New Entry', shortcut: ['meta', 'n'] })} ctx={makeCtx()} />
      <DefaultListItem item={makeItem({ id: 'i4', label: 'Open Palette', shortcut: ['meta', 'k'] })} ctx={makeCtx()} />
    </PaletteShell>
  ),
};

export const WithIcon: Story = {
  name: 'With Icon',
  render: () => (
    <PaletteShell>
      <DefaultListItem item={makeItem({ label: 'Notebook', icon: <BookOpen className="w-4 h-4" /> })} ctx={makeCtx()} />
      <DefaultListItem item={makeItem({ id: 'i2', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> })} ctx={makeCtx()} />
      <DefaultListItem item={makeItem({ id: 'i3', label: 'WOD: Fran', icon: <Dumbbell className="w-4 h-4" /> })} ctx={makeCtx()} />
    </PaletteShell>
  ),
};

export const WithSubtitle: Story = {
  name: 'With Subtitle',
  render: () => (
    <PaletteShell>
      <DefaultListItem
        item={makeItem({ label: 'Fran', subtitle: '21-15-9 Thrusters / Pull-ups', icon: <Dumbbell className="w-4 h-4" /> })}
        ctx={makeCtx()}
      />
      <DefaultListItem
        item={makeItem({ id: 'i2', label: 'Tuesday AM', subtitle: 'Apr 14 · 22:00', icon: <Calendar className="w-4 h-4" /> })}
        ctx={makeCtx()}
      />
      <DefaultListItem
        item={makeItem({ id: 'i3', label: 'Result: murph', subtitle: '2024-04-14 · Completed', badge: 'Result' })}
        ctx={makeCtx()}
      />
    </PaletteShell>
  ),
};

export const States: Story = {
  name: 'States',
  render: () => (
    <div className="flex flex-col gap-3 w-[480px]">
      <div>
        <p className="text-xs text-zinc-400 font-mono mb-1">default</p>
        <PaletteShell>
          <DefaultListItem item={makeItem({ label: 'Go to Notebook', shortcut: ['g', 'n'] })} ctx={makeCtx()} />
        </PaletteShell>
      </div>
      <div>
        <p className="text-xs text-zinc-400 font-mono mb-1">active (keyboard focus)</p>
        <PaletteShell>
          <DefaultListItem item={makeItem({ label: 'Go to Notebook', shortcut: ['g', 'n'] })} ctx={makeCtx({ isActive: true })} />
        </PaletteShell>
      </div>
      <div>
        <p className="text-xs text-zinc-400 font-mono mb-1">selected</p>
        <PaletteShell>
          <DefaultListItem item={makeItem({ label: 'Go to Notebook', shortcut: ['g', 'n'] })} ctx={makeCtx({ isSelected: true })} />
        </PaletteShell>
      </div>
      <div>
        <p className="text-xs text-zinc-400 font-mono mb-1">disabled</p>
        <PaletteShell>
          <DefaultListItem item={makeItem({ label: 'Go to Notebook', isDisabled: true })} ctx={makeCtx()} />
        </PaletteShell>
      </div>
    </div>
  ),
};

export const WithActions: Story = {
  name: 'With Actions',
  render: () => (
    <PaletteShell>
      <div className="group">
        <DefaultListItem
          item={makeItem({ label: 'Tuesday AM', subtitle: 'Apr 14 · 22:00', icon: <Calendar className="w-4 h-4" /> })}
          ctx={makeCtx({
            actions: [
              { id: 'run', label: 'Run', icon: <Play className="w-3 h-3" />, isPrimary: true, action: { type: 'call', handler: () => {} } },
              { id: 'copy', label: 'Copy', icon: <Copy className="w-3 h-3" />, action: { type: 'call', handler: () => {} } },
            ],
          })}
        />
      </div>
    </PaletteShell>
  ),
};

export const GroupHeadingStory: Story = {
  name: 'Group Heading',
  render: () => (
    <PaletteShell>
      <GroupHeading label="Navigation" />
      <GroupHeading label="Example Workouts" />
      <GroupHeading label="Actions" />
    </PaletteShell>
  ),
};

export const GroupedItems: Story = {
  name: 'Grouped Items',
  render: () => (
    <PaletteShell>
      <div className="mb-1">
        <GroupHeading label="Navigation" />
        <DefaultListItem item={makeItem({ id: 'n1', label: 'Go to Notebook', shortcut: ['g', 'n'] })} ctx={makeCtx()} />
        <DefaultListItem item={makeItem({ id: 'n2', label: 'Go to Playground', shortcut: ['g', 'h'] })} ctx={makeCtx()} />
      </div>
      <div className="mb-1">
        <GroupHeading label="Example Workouts" />
        <DefaultListItem item={makeItem({ id: 'w1', label: 'WOD: Fran', icon: <Dumbbell className="w-4 h-4" /> })} ctx={makeCtx({ isActive: true })} />
        <DefaultListItem item={makeItem({ id: 'w2', label: 'WOD: Cindy', icon: <Dumbbell className="w-4 h-4" /> })} ctx={makeCtx()} />
        <DefaultListItem item={makeItem({ id: 'w3', label: 'WOD: Murph', icon: <Dumbbell className="w-4 h-4" /> })} ctx={makeCtx()} />
      </div>
    </PaletteShell>
  ),
};

export const EmptyStateStory: Story = {
  name: 'Empty State',
  render: () => (
    <PaletteShell>
      <EmptyState />
    </PaletteShell>
  ),
};
