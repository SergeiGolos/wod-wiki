import type { Meta, StoryObj } from '@storybook/react';
import { Calendar, FileText, Dumbbell, Play, Copy, Edit2 } from 'lucide-react';
import { ListView } from '@/components/list/ListView';
import { CommandListView } from '@/components/list/CommandListView';
import { ActionBarView } from '@/components/list/ActionBarView';
import type { IListItem, IItemAction } from '@/components/list/types';
import { useState } from 'react';

// ─── Sample data ────────────────────────────────────────────────────────────

const workoutItems: IListItem<{ wod: string }>[] = [
  { id: '1', label: 'Fran', subtitle: '21-15-9 Thrusters / Pull-ups', group: 'Benchmark', icon: <Dumbbell className="w-4 h-4" />, badge: 'Hero', payload: { wod: 'fran' } },
  { id: '2', label: 'Grace', subtitle: '30 Clean & Jerks for time', group: 'Benchmark', icon: <Dumbbell className="w-4 h-4" />, payload: { wod: 'grace' } },
  { id: '3', label: 'EMOM 10', subtitle: '10 burpees every minute', group: 'Custom', icon: <Calendar className="w-4 h-4" />, payload: { wod: 'emom10' } },
  { id: '4', label: 'Tuesday AM', subtitle: 'Apr 14 · 22:00', group: 'Custom', icon: <Calendar className="w-4 h-4" />, payload: { wod: 'tue' } },
];

const commandItems: IListItem<{ action: string }>[] = [
  { id: 'c1', label: 'Go to Notebook', group: 'Navigation', shortcut: ['g', 'n'], keywords: ['notebook', 'journal'], payload: { action: 'nav-notebook' } },
  { id: 'c2', label: 'Go to Playground', group: 'Navigation', shortcut: ['g', 'h'], payload: { action: 'nav-home' } },
  { id: 'c3', label: 'New Entry', group: 'Actions', shortcut: ['⌘', 'n'], payload: { action: 'new' } },
  { id: 'c4', label: 'Search workouts', group: 'Actions', shortcut: ['⌘', 'k'], payload: { action: 'search' } },
];

const toolbarItems: IListItem<{ cmd: string }>[] = [
  { id: 't1', label: 'Run', icon: <Play className="w-3 h-3 fill-current" />, payload: { cmd: 'run', primary: true } as { cmd: string; primary: boolean } },
  { id: 't2', label: 'Copy link', icon: <Copy className="w-3 h-3" />, payload: { cmd: 'copy' } },
  { id: 't3', label: 'Edit', icon: <Edit2 className="w-3 h-3" />, payload: { cmd: 'edit' } },
];

// ─── ListView stories ────────────────────────────────────────────────────────

const listMeta: Meta<typeof ListView> = {
  title: 'catalog/organisms/ListView',
  component: ListView,
  parameters: { layout: 'padded', subsystem: 'workbench' },
};
export default listMeta;

type ListStory = StoryObj<typeof ListView>;

export const Default: ListStory = {
  render: () => (
    <div className="w-72 border border-zinc-200 rounded-lg overflow-hidden">
      <ListView items={workoutItems} onSelect={item => alert(item.label)} />
    </div>
  ),
};

export const Searchable: ListStory = {
  render: () => (
    <div className="w-72 border border-zinc-200 rounded-lg overflow-hidden">
      <ListView items={workoutItems} searchable onSelect={item => alert(item.label)} />
    </div>
  ),
};

export const Grouped: ListStory = {
  render: () => (
    <div className="w-72 border border-zinc-200 rounded-lg overflow-hidden">
      <ListView items={workoutItems} grouped onSelect={item => alert(item.label)} />
    </div>
  ),
};

export const WithActions: ListStory = {
  render: () => {
    const actions = (_item: IListItem<{ wod: string }>): IItemAction[] => [
      { id: 'edit', label: 'Edit', icon: <Edit2 className="w-3 h-3" />, action: { type: 'call', handler: () => alert(`Edit`) } },
      { id: 'run', label: 'Run', icon: <Play className="w-3 h-3" />, isPrimary: true, action: { type: 'call', handler: () => alert(`Run`) } },
    ];
    return (
      <div className="w-72 border border-zinc-200 rounded-lg overflow-hidden">
        <ListView items={workoutItems} actions={actions} onSelect={() => {}} />
      </div>
    );
  },
};

export const EmptyState: ListStory = {
  render: () => (
    <div className="w-72 border border-zinc-200 rounded-lg overflow-hidden">
      <ListView
        items={[]}
        emptyState={
          <div className="py-10 flex flex-col items-center gap-2 text-zinc-400">
            <FileText className="w-8 h-8" />
            <span className="text-sm">No workouts yet</span>
          </div>
        }
      />
    </div>
  ),
};

// ─── CommandListView story ───────────────────────────────────────────────────

export const CommandPalette: ListStory = {
  render: () => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(true);
    return (
      <div className="w-[480px]">
        <button
          className="mb-4 rounded px-3 py-1 border text-sm"
          onClick={() => setOpen(o => !o)}
        >
          Toggle palette
        </button>
        <CommandListView
          items={commandItems}
          query={query}
          onQueryChange={setQuery}
          onSelect={item => alert(item.label)}
          isOpen={open}
          onClose={() => setOpen(false)}
          placeholder="Type a command…"
        />
      </div>
    );
  },
};

// ─── ActionBarView story ─────────────────────────────────────────────────────

export const ActionBar: ListStory = {
  render: () => (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <p className="text-xs text-zinc-400 mb-2">Horizontal (default)</p>
        <ActionBarView items={toolbarItems} onSelect={item => alert(item.label)} />
      </div>
      <div>
        <p className="text-xs text-zinc-400 mb-2">Vertical</p>
        <ActionBarView items={toolbarItems} onSelect={item => alert(item.label)} orientation="vertical" />
      </div>
    </div>
  ),
};
