/**
 * Catalog / Molecules / CommandPalette
 *
 * The assembled command palette: search input + grouped result list.
 * Rendered inline (no dialog overlay) so typing works freely in Storybook.
 *
 * Each story samples a distinct usage pattern from the application:
 *
 *  1. GlobalNavigation     – navigation + actions groups (WodNavigation pattern)
 *  2. CollectionSearch     – scoped single-collection results
 *  3. MultiSourceSearch    – workouts + results mixed (global search pattern)
 *  4. StatementBuilder     – contextual header with segment pills
 *  5. EmptyResults         – query that matches nothing
 *  6. DialogTrigger        – full dialog experience (click or ⌘K to open)
 */

import React, { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CommandListView } from '@/components/list/CommandListView';
import type { IListItem } from '@/components/list/types';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { useCommandPalette } from '@/components/command-palette/CommandContext';
import type { Command } from '@/components/command-palette/types';
import { Search, Dumbbell, Calendar } from 'lucide-react';

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const navItems: IListItem<{ action: string }>[] = [
  { id: 'n1', label: 'Go to Notebook (History)', group: 'Navigation', shortcut: ['g', 'n'], keywords: ['notebook'], payload: { action: 'nav-notebook' } },
  { id: 'n2', label: 'Go to Playground',        group: 'Navigation', shortcut: ['g', 'h'], keywords: ['playground'], payload: { action: 'nav-home' } },
  { id: 'n3', label: 'Go to Calendar',           group: 'Navigation', shortcut: ['g', 'c'], keywords: ['calendar'], payload: { action: 'nav-calendar' } },
  { id: 'a1', label: 'New Journal Entry',        group: 'Actions',    shortcut: ['meta', 'n'], payload: { action: 'new-entry' } },
  { id: 'a2', label: 'Search Workouts',          group: 'Actions',    shortcut: ['meta', 'k'], payload: { action: 'search' } },
];

const wodItems: IListItem<{ action: string }>[] = [
  { id: 'w1', label: 'WOD: Fran',   group: 'Navigation', icon: <Dumbbell className="w-4 h-4" />, keywords: ['fran'],  payload: { action: 'nav-fran' } },
  { id: 'w2', label: 'WOD: Cindy',  group: 'Navigation', icon: <Dumbbell className="w-4 h-4" />, keywords: ['cindy'], payload: { action: 'nav-cindy' } },
  { id: 'w3', label: 'WOD: Murph',  group: 'Navigation', icon: <Dumbbell className="w-4 h-4" />, keywords: ['murph'], payload: { action: 'nav-murph' } },
  { id: 'w4', label: 'WOD: Grace',  group: 'Navigation', icon: <Dumbbell className="w-4 h-4" />, keywords: ['grace'], payload: { action: 'nav-grace' } },
  { id: 'w5', label: 'WOD: Helen',  group: 'Navigation', icon: <Dumbbell className="w-4 h-4" />, keywords: ['helen'], payload: { action: 'nav-helen' } },
];

const benchmarkItems: IListItem<{ action: string }>[] = [
  { id: 'b1', label: 'Fran',   subtitle: '21-15-9 Thrusters / Pull-ups',          group: 'Benchmarks', icon: <Dumbbell className="w-4 h-4" />, payload: { action: 'open-fran' } },
  { id: 'b2', label: 'Cindy',  subtitle: '5 Pull-ups / 10 Push-ups / 15 Squats',  group: 'Benchmarks', icon: <Dumbbell className="w-4 h-4" />, payload: { action: 'open-cindy' } },
  { id: 'b3', label: 'Murph',  subtitle: '1 mile Run + 300 reps + 1 mile Run',    group: 'Benchmarks', icon: <Dumbbell className="w-4 h-4" />, payload: { action: 'open-murph' } },
  { id: 'b4', label: 'Grace',  subtitle: '30 Clean & Jerks for time',             group: 'Benchmarks', icon: <Dumbbell className="w-4 h-4" />, payload: { action: 'open-grace' } },
  { id: 'b5', label: 'Helen',  subtitle: '3 rounds 400m Run + KB Swings + Pull-ups', group: 'Benchmarks', icon: <Dumbbell className="w-4 h-4" />, payload: { action: 'open-helen' } },
];

const mixedItems: IListItem<{ type: string; id: string }>[] = [
  { id: 'w1', label: 'Fran',           subtitle: 'WOD · Benchmark',         group: 'Workouts', icon: <Dumbbell className="w-4 h-4" />, payload: { type: 'workout', id: 'fran' } },
  { id: 'w2', label: 'Murph',          subtitle: 'WOD · Hero',              group: 'Workouts', icon: <Dumbbell className="w-4 h-4" />, payload: { type: 'workout', id: 'murph' } },
  { id: 'r1', label: 'Result: fran',   subtitle: '2024-04-14 · Completed',  group: 'Results',  icon: <Calendar className="w-4 h-4" />,  badge: 'Result', payload: { type: 'result', id: 'r1' } },
  { id: 'r2', label: 'Result: murph',  subtitle: '2024-04-10 · Partial',    group: 'Results',  icon: <Calendar className="w-4 h-4" />,  badge: 'Result', payload: { type: 'result', id: 'r2' } },
  { id: 'p1', label: 'Go to Notebook', subtitle: 'Navigation',              group: 'Actions',  shortcut: ['g', 'n'], payload: { type: 'action', id: 'nav-notebook' } },
];

// ─── Statement-builder header ─────────────────────────────────────────────────

const segmentData: Record<number, { label: string; items: IListItem<string>[] }> = {
  0: {
    label: 'Repetitions',
    items: [5, 10, 15, 20, 21].map(n => ({
      id: `r${n}`, label: `${n} reps`, group: 'Repetitions', payload: String(n),
    })),
  },
  1: {
    label: 'Movement',
    items: ['Kettlebell Swings', 'Goblet Squats', 'Overhead Press', 'Kettlebell Snatch', 'Burpees'].map(m => ({
      id: m, label: m, group: 'Movement', payload: m,
    })),
  },
  2: {
    label: 'Load / Intensity',
    items: ['16kg', '20kg', '24kg', '32kg', 'Bodyweight'].map(w => ({
      id: w, label: w, group: 'Load / Intensity', payload: w,
    })),
  },
};

// ─── Story wrappers ───────────────────────────────────────────────────────────

function PaletteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[480px] shadow-2xl rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
      {children}
    </div>
  );
}

// 1 ── Global Navigation
const GlobalNavigationDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  const allItems = [...navItems, ...wodItems];
  return (
    <PaletteFrame>
      <CommandListView
        items={allItems}
        query={query}
        onQueryChange={setQuery}
        onSelect={item => alert(`Selected: ${item.label}`)}
        isOpen
        onClose={() => {}}
        placeholder="Type a command or search…"
      />
    </PaletteFrame>
  );
};

// 2 ── Collection Search
const CollectionSearchDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  return (
    <PaletteFrame>
      <CommandListView
        items={benchmarkItems}
        query={query}
        onQueryChange={setQuery}
        onSelect={item => alert(`Selected: ${item.label}`)}
        isOpen
        onClose={() => {}}
        placeholder="Search in Benchmarks…"
      />
    </PaletteFrame>
  );
};

// 3 ── Multi-source Search
const MultiSourceSearchDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  return (
    <PaletteFrame>
      <CommandListView
        items={mixedItems}
        query={query}
        onQueryChange={setQuery}
        onSelect={item => alert(`Selected: ${item.label}`)}
        isOpen
        onClose={() => {}}
        placeholder="Search workouts, results, or actions…"
      />
    </PaletteFrame>
  );
};

// 4 ── Statement Builder
const StatementBuilderHeader: React.FC<{
  segments: string[];
  activeIdx: number;
  onTabNext: () => void;
}> = ({ segments, activeIdx, onTabNext }) => (
  <div className="flex flex-col border-b border-border">
    <div className="px-4 py-3 bg-primary/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Statement Builder</span>
        <button
          onClick={onTabNext}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-card text-[9px] font-bold text-muted-foreground shadow-sm hover:bg-muted"
        >
          <kbd className="opacity-50">Tab</kbd> <span>Next Segment</span>
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 font-mono text-sm">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`px-2 py-1 rounded-md border transition-all duration-200 ${
              i === activeIdx
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-105'
                : 'bg-background text-foreground/60 border-border'
            }`}
          >
            {seg}
          </div>
        ))}
      </div>
    </div>
    <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
        {segmentData[activeIdx]?.label ?? 'Segment'}
      </span>
      <span className="text-[10px] font-medium text-primary/60">
        Segment {activeIdx + 1} of {segments.length}
      </span>
    </div>
  </div>
);

const StatementBuilderDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const segments = ['10', 'Kettlebell Swings', '24kg'];
  const { items } = segmentData[activeIdx];

  return (
    <PaletteFrame>
      <CommandListView
        items={items}
        query={query}
        onQueryChange={setQuery}
        onSelect={item => alert(`Selected: ${item.label}`)}
        isOpen
        onClose={() => {}}
        placeholder={`Modify ${segmentData[activeIdx].label}…`}
        header={
          <StatementBuilderHeader
            segments={segments}
            activeIdx={activeIdx}
            onTabNext={() => setActiveIdx(i => (i + 1) % segments.length)}
          />
        }
      />
    </PaletteFrame>
  );
};

// 5 ── Empty Results
const EmptyResultsDemo: React.FC = () => {
  const [query, setQuery] = useState('zzz');
  return (
    <PaletteFrame>
      <CommandListView
        items={navItems}
        query={query}
        onQueryChange={setQuery}
        onSelect={() => {}}
        isOpen
        onClose={() => {}}
        placeholder="Type a command or search…"
      />
    </PaletteFrame>
  );
};

// 6 ── Dialog Trigger (uses CommandContext + Radix Dialog)
const dialogCommands: Command[] = [
  { id: 'n1', label: 'Go to Notebook', action: () => {}, group: 'Navigation', shortcut: ['g', 'n'] },
  { id: 'n2', label: 'Go to Playground', action: () => {}, group: 'Navigation', shortcut: ['g', 'h'] },
  { id: 'a1', label: 'New Entry', action: () => {}, group: 'Actions', shortcut: ['meta', 'n'] },
];

const DialogTriggerDemo: React.FC = () => {
  const { setIsOpen, registerCommand } = useCommandPalette();

  useEffect(() => {
    const cleanups = dialogCommands.map(cmd => registerCommand(cmd));
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsOpen(true); }
    };
    window.addEventListener('keydown', handleKey);
    return () => { cleanups.forEach(c => c()); window.removeEventListener('keydown', handleKey); };
  }, [setIsOpen, registerCommand]);

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <p className="text-sm text-zinc-500 text-center">
        Click the button or press <kbd className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs">⌘K</kbd> to open the palette as a dialog.
      </p>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
      >
        <Search className="h-3.5 w-3.5 text-zinc-400" />
        Open palette
        <kbd className="ml-1 rounded border border-zinc-200 px-1 py-0.5 text-[10px] text-zinc-400 dark:border-zinc-600">⌘K</kbd>
      </button>
      <CommandPalette />
    </div>
  );
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'catalog/organisms/CommandPalette',
  parameters: { layout: 'centered', subsystem: 'workbench' },
};
export default meta;
type Story = StoryObj;

// ─── Stories ─────────────────────────────────────────────────────────────────

export const GlobalNavigation: Story = {
  name: 'Global Navigation',
  render: () => <GlobalNavigationDemo />,
};

export const CollectionSearch: Story = {
  name: 'Collection Search',
  render: () => <CollectionSearchDemo />,
};

export const MultiSourceSearch: Story = {
  name: 'Multi-Source Search',
  render: () => <MultiSourceSearchDemo />,
};

export const StatementBuilder: Story = {
  name: 'Statement Builder',
  render: () => <StatementBuilderDemo />,
};

export const EmptyResults: Story = {
  name: 'Empty Results',
  render: () => <EmptyResultsDemo />,
};

export const DialogTrigger: Story = {
  name: 'Dialog Trigger',
  render: () => <DialogTriggerDemo />,
};
