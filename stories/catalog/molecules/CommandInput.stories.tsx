/**
 * Catalog / Atoms / CommandInput
 *
 * The search-input row used at the top of every command-palette variant.
 * Consists of: leading Search icon · text input · trailing Esc badge.
 *
 * Stories:
 *  1. Empty        – no value, default placeholder
 *  2. WithValue    – pre-filled search text
 *  3. CustomPlaceholder – strategy-specific prompt text
 *  4. States       – all three in one view
 */

import React, { useRef, useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Search } from 'lucide-react';

// ─── Primitive ───────────────────────────────────────────────────────────────

interface CommandInputRowProps {
  value?: string;
  placeholder?: string;
  onChange?: (v: string) => void;
  autoFocus?: boolean;
}

const CommandInputRow: React.FC<CommandInputRowProps> = ({
  value = '',
  placeholder = 'Type a command or search…',
  onChange,
  autoFocus = false,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);

  return (
    <div className="flex items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <Search className="h-4 w-4 shrink-0 text-zinc-400" />
      <input
        ref={ref}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange?.(e.target.value)}
        className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
      />
      <kbd className="hidden rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-400 sm:inline dark:border-zinc-600">
        esc
      </kbd>
    </div>
  );
};

// ─── Interactive wrapper for live stories ────────────────────────────────────

const LiveInput: React.FC<{ placeholder?: string; initialValue?: string }> = ({
  placeholder,
  initialValue = '',
}) => {
  const [value, setValue] = useState(initialValue);
  return (
    <div className="w-[480px] rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-lg">
      <CommandInputRow
        value={value}
        placeholder={placeholder}
        onChange={setValue}
        autoFocus
      />
      {value && (
        <p className="px-3 py-2 text-xs text-zinc-400">
          Current query: <span className="font-mono text-zinc-600 dark:text-zinc-300">{value}</span>
        </p>
      )}
    </div>
  );
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'catalog/molecules/commands/CommandInput',
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj;

// ─── Stories ─────────────────────────────────────────────────────────────────

export const Empty: Story = {
  name: 'Empty',
  render: () => <LiveInput />,
};

export const WithValue: Story = {
  name: 'With Value',
  render: () => <LiveInput initialValue="fran" />,
};

export const CustomPlaceholder: Story = {
  name: 'Custom Placeholder',
  render: () => (
    <div className="flex flex-col gap-4 w-[480px]">
      <LiveInput placeholder="Search for a workout…" />
      <LiveInput placeholder="Search in Benchmarks…" />
      <LiveInput placeholder="Modify Repetitions…" />
    </div>
  ),
};

export const States: Story = {
  name: 'All States',
  render: () => (
    <div className="flex flex-col gap-2 w-[480px]">
      <p className="text-xs text-zinc-400 font-mono">empty</p>
      <div className="rounded-xl border border-zinc-200 overflow-hidden shadow">
        <CommandInputRow placeholder="Type a command or search…" />
      </div>

      <p className="text-xs text-zinc-400 font-mono mt-2">with value</p>
      <div className="rounded-xl border border-zinc-200 overflow-hidden shadow">
        <CommandInputRow value="fran" placeholder="Type a command or search…" />
      </div>

      <p className="text-xs text-zinc-400 font-mono mt-2">strategy placeholder</p>
      <div className="rounded-xl border border-zinc-200 overflow-hidden shadow">
        <CommandInputRow placeholder="Modify Repetitions…" />
      </div>
    </div>
  ),
};
