/**
 * Catalog / Atoms / ShortcutBadge
 *
 * Keyboard shortcut tokens rendered as styled <kbd> elements.
 * Modifier symbols are substituted automatically:
 *   meta → ⌘   shift → ⇧   alt → ⌥
 *
 * The component is inlined in DefaultListItem; this story catalogs it
 * in isolation so the visual style can be validated independently.
 *
 * Stories:
 *  1. SingleKey       – one plain key token
 *  2. ModifierPlusKey – modifier + letter combos
 *  3. Sequence        – two-key sequences (g → n)
 *  4. AllModifiers    – every substitution side-by-side
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

// ─── Atom (replicated from DefaultListItem) ───────────────────────────────────

function ShortcutBadge({ tokens }: { tokens: string[] }) {
  return (
    <span className="flex items-center gap-0.5">
      {tokens.map((token, i) => (
        <kbd
          key={i}
          className="inline-flex items-center rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-[10px] font-mono text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          {token === 'meta' ? '⌘' : token === 'shift' ? '⇧' : token === 'alt' ? '⌥' : token}
        </kbd>
      ))}
    </span>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────────

const Row: React.FC<{ label: string; tokens: string[] }> = ({ label, tokens }) => (
  <div className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
    <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
    <ShortcutBadge tokens={tokens} />
  </div>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

// ShortcutBadge is not a standalone exported component — expose a wrapper.
const ShortcutBadgeWrapper: React.FC<{ tokens: string[] }> = ({ tokens }) => (
  <ShortcutBadge tokens={tokens} />
);

const meta: Meta<typeof ShortcutBadgeWrapper> = {
  title: 'catalog/atoms/ShortcutBadge',
  component: ShortcutBadgeWrapper,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof ShortcutBadgeWrapper>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** Single plain key token. */
export const SingleKey: Story = {
  args: { tokens: ['k'] },
};

/** Modifier + letter combos used throughout the app. */
export const ModifierPlusKey: Story = {
  render: () => (
    <div className="flex flex-col gap-0 w-fit">
      <Row label="Open palette"  tokens={['meta', 'k']} />
      <Row label="New entry"     tokens={['meta', 'n']} />
      <Row label="Save"          tokens={['meta', 's']} />
      <Row label="Find"          tokens={['meta', 'f']} />
      <Row label="Undo"          tokens={['meta', 'z']} />
      <Row label="Redo"          tokens={['meta', 'shift', 'z']} />
      <Row label="Close"         tokens={['Escape']} />
    </div>
  ),
};

/** Two-key sequences (press g, then n). */
export const Sequence: Story = {
  render: () => (
    <div className="flex flex-col gap-0 w-fit">
      <Row label="Go to notebook" tokens={['g', 'n']} />
      <Row label="Go to history"  tokens={['g', 'h']} />
      <Row label="Go to today"    tokens={['g', 't']} />
    </div>
  ),
};

/** All modifier symbol substitutions side-by-side. */
export const AllModifiers: Story = {
  render: () => (
    <div className="flex flex-col gap-0 w-fit">
      <Row label="meta  → ⌘" tokens={['meta']} />
      <Row label="shift → ⇧" tokens={['shift']} />
      <Row label="alt   → ⌥" tokens={['alt']} />
      <Row label="plain key" tokens={['Enter']} />
      <Row label="combo"     tokens={['meta', 'shift', 'p']} />
    </div>
  ),
};
