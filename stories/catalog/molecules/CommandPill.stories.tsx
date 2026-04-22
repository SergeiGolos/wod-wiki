/**
 * Catalog / Molecules / CommandPill
 *
 * A compact action pill used in the editor's inline command bar.
 * Comes in two layouts:
 *
 *  Simple  – single click zone: [ icon  label ]
 *  Split   – two click zones:   [ icon  label ] | [ copy-icon ]
 *
 * The split zone shows a success flash (emerald) after the secondary
 * action completes and automatically resets after 1.5 s.
 *
 * ⚠️  Catalog surrogate: This story's `CommandPill` is a simplified demo.
 *     The production component in `InlineCommandBar.tsx` also accepts
 *     `block: IRuntimeBlock` (the active runtime block), which provides
 *     live state for conditional actions. The story omits that dependency
 *     to allow isolated visual testing.
 *
 * Stories:
 *  1. Primary          – primary style, no split zone
 *  2. Secondary        – secondary style, no split zone
 *  3. WithSplitZone    – split-zone layout with copy action
 *  4. AllVariants      – primary / secondary × simple / split
 */

import React, { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Play, LayoutDashboard, CalendarCheck, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Atom (replicated from InlineCommandBar) ─────────────────────────────────

interface CommandDef {
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  splitIcon?: React.ReactNode;
  splitSuccessIcon?: React.ReactNode;
  onClick: () => void;
  onSplitClick?: () => Promise<void>;
  /** Disables interaction and dims the command pill. */
  disabled?: boolean;
  /** Highlights the command as currently selected/active. */
  active?: boolean;
}

const CommandPill: React.FC<{ cmd: CommandDef }> = ({ cmd }) => {
  const [splitOk, setSplitOk] = useState(false);

  const handleMain = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cmd.onClick();
  }, [cmd]);

  const handleSplit = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cmd.onSplitClick || splitOk) return;
    await cmd.onSplitClick();
    setSplitOk(true);
    setTimeout(() => setSplitOk(false), 1500);
  }, [cmd, splitOk]);

  const base = cn(
    'flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors shadow-sm',
    cmd.primary
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50',
    cmd.active && 'ring-2 ring-primary/60',
    cmd.disabled && 'opacity-50 pointer-events-none',
  );

  if (!cmd.onSplitClick) {
    return (
      <button title={cmd.label} onClick={handleMain} className={cn(base, 'rounded-sm')}>
        <span className="flex items-center h-3 w-3">{cmd.icon}</span>
        <span>{cmd.label}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-stretch rounded-sm overflow-hidden border',
        cmd.primary ? 'border-primary/50' : 'border-border/50',
        cmd.active && 'ring-2 ring-primary/60',
        cmd.disabled && 'opacity-50 pointer-events-none',
      )}
    >
      <button
        title={cmd.label}
        onClick={handleMain}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors',
          cmd.primary
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        )}
      >
        <span className="flex items-center h-3 w-3">{cmd.icon}</span>
        <span>{cmd.label}</span>
      </button>
      <div className={cn('w-px self-stretch', cmd.primary ? 'bg-primary-foreground/20' : 'bg-border/60')} />
      <button
        title="Copy link"
        onClick={handleSplit}
        className={cn(
          'flex items-center justify-center px-1.5 py-0.5 transition-all duration-300',
          splitOk
            ? 'text-emerald-600 bg-emerald-500/15 dark:text-emerald-400 dark:bg-emerald-500/20'
            : cmd.primary
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        )}
      >
        <span className="flex items-center h-3 w-3">
          {splitOk ? (cmd.splitSuccessIcon ?? cmd.splitIcon) : cmd.splitIcon}
        </span>
      </button>
    </div>
  );
};

// ─── Mock commands ────────────────────────────────────────────────────────────

const runCmd: CommandDef = {
  label: 'Run',
  icon: <Play className="h-3 w-3" />,
  primary: true,
  onClick: () => alert('Run'),
};

const planCmd: CommandDef = {
  label: 'Plan',
  icon: <CalendarCheck className="h-3 w-3" />,
  onClick: () => alert('Plan'),
};

const playgroundCmd: CommandDef = {
  label: 'Playground',
  icon: <LayoutDashboard className="h-3 w-3" />,
  onClick: () => alert('Playground'),
  splitIcon: <Copy className="h-3 w-3" />,
  splitSuccessIcon: <Check className="h-3 w-3" />,
  onSplitClick: async () => { await new Promise(r => setTimeout(r, 300)); },
};

const runWithSplit: CommandDef = {
  ...runCmd,
  splitIcon: <Copy className="h-3 w-3" />,
  splitSuccessIcon: <Check className="h-3 w-3" />,
  onSplitClick: async () => { await new Promise(r => setTimeout(r, 300)); },
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const Wrapper: React.FC = () => <CommandPill cmd={runCmd} />;

const meta: Meta<typeof Wrapper> = {
  title: 'catalog/molecules/commands/CommandPill',
  component: Wrapper,
  parameters: { layout: 'padded', subsystem: 'workbench' },
};

export default meta;
type Story = StoryObj<typeof Wrapper>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Primary style — single click zone. */
export const Primary: Story = {
  render: () => <CommandPill cmd={runCmd} />,
};

/** Secondary style — single click zone. */
export const Secondary: Story = {
  render: () => <CommandPill cmd={planCmd} />,
};

/** Split-zone layout with a copy-link secondary action. */
export const WithSplitZone: Story = {
  render: () => (
    <div className="flex gap-2">
      <CommandPill cmd={playgroundCmd} />
      <CommandPill cmd={runWithSplit} />
    </div>
  ),
};

/** All variants in a compact command bar layout. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Simple (no split zone)</p>
        <div className="flex gap-1.5">
          <CommandPill cmd={runCmd} />
          <CommandPill cmd={planCmd} />
          <CommandPill cmd={{ ...playgroundCmd, onSplitClick: undefined }} />
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">With split zone</p>
        <div className="flex gap-1.5">
          <CommandPill cmd={runWithSplit} />
          <CommandPill cmd={playgroundCmd} />
        </div>
      </div>
    </div>
  ),
};

export const DisabledState: Story = {
  name: 'Disabled',
  render: () => (
    <div className="flex gap-2">
      <CommandPill cmd={{ ...runCmd, disabled: true }} />
      <CommandPill cmd={{ ...playgroundCmd, disabled: true }} />
    </div>
  ),
};

export const ActiveSelected: Story = {
  name: 'Active / selected',
  render: () => (
    <div className="flex gap-2">
      <CommandPill cmd={{ ...runCmd, active: true }} />
      <CommandPill cmd={planCmd} />
      <CommandPill cmd={{ ...playgroundCmd, active: true }} />
    </div>
  ),
};

export const OverflowManyCommands: Story = {
  name: 'Overflow / many commands',
  render: () => (
    <div className="w-[320px] overflow-x-auto border border-border rounded-md p-2">
      <div className="inline-flex gap-1.5 min-w-max">
        {[
          runCmd,
          planCmd,
          playgroundCmd,
          runWithSplit,
          { ...planCmd, label: 'Archive' },
          { ...runCmd, label: 'Benchmark' },
          { ...playgroundCmd, label: 'Collections' },
        ].map((cmd, idx) => (
          <CommandPill key={`${cmd.label}-${idx}`} cmd={cmd} />
        ))}
      </div>
    </div>
  ),
};
