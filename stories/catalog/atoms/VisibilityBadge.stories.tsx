/**
 * Catalog / Atoms / VisibilityBadge
 *
 * A colored icon-badge that indicates the visibility tier of a metric
 * in the runtime memory system. Used in debug mode overlays.
 *
 *  display  – green Eye      – metric is shown in the main display
 *  result   – purple Check   – metric is recorded as a result
 *  promote  – blue Arrow     – metric is promoted to a parent block
 *  private  – amber Lock     – metric is private to the current block
 *
 * The component is inlined in VisualStateComponents; this story
 * catalogs it in isolation.
 *
 * Stories:
 *  1. AllTiers   – all four tiers side-by-side
 *  2. Display    – single display tier
 *  3. Result     – single result tier
 *  4. Promote    – single promote tier
 *  5. Private    – single private tier
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Eye, ArrowUpCircle, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Atom (replicated from VisualStateComponents) ────────────────────────────

type MetricVisibility = 'display' | 'result' | 'promote' | 'private';

const VISIBILITY_ICON_MAP: Record<MetricVisibility, React.ElementType> = {
  display: Eye,
  promote: ArrowUpCircle,
  private: Lock,
  result:  CheckCircle2,
};

const VISIBILITY_COLOR_MAP: Record<MetricVisibility, string> = {
  display: 'text-green-500',
  promote: 'text-blue-500',
  private: 'text-amber-500',
  result:  'text-purple-500',
};

const VISIBILITY_BG_MAP: Record<MetricVisibility, string> = {
  display: 'bg-green-500/10',
  promote: 'bg-blue-500/10',
  private: 'bg-amber-500/10',
  result:  'bg-purple-500/10',
};

const VISIBILITY_LABELS: Record<MetricVisibility, string> = {
  display: 'Display',
  result:  'Result',
  promote: 'Promote',
  private: 'Private',
};

function VisibilityBadge({ visibility }: { visibility: MetricVisibility }) {
  const Icon = VISIBILITY_ICON_MAP[visibility];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
        VISIBILITY_COLOR_MAP[visibility],
        VISIBILITY_BG_MAP[visibility],
      )}
      title={VISIBILITY_LABELS[visibility]}
    >
      <Icon className="h-3 w-3" />
      {VISIBILITY_LABELS[visibility]}
    </span>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const VisibilityBadgeWrapper: React.FC<{ visibility: MetricVisibility }> = ({ visibility }) => (
  <VisibilityBadge visibility={visibility} />
);

const meta: Meta<typeof VisibilityBadgeWrapper> = {
  title: 'catalog/atoms/VisibilityBadge',
  component: VisibilityBadgeWrapper,
  parameters: { layout: 'padded' },
  argTypes: {
    visibility: {
      control: 'select',
      options: ['display', 'result', 'promote', 'private'] as MetricVisibility[],
    },
  },
};

export default meta;
type Story = StoryObj<typeof VisibilityBadgeWrapper>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/** All four visibility tiers side-by-side. */
export const AllTiers: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 p-2">
      <VisibilityBadge visibility="display" />
      <VisibilityBadge visibility="result" />
      <VisibilityBadge visibility="promote" />
      <VisibilityBadge visibility="private" />
    </div>
  ),
};

export const Display: Story = { args: { visibility: 'display' } };
export const Result:  Story = { args: { visibility: 'result' } };
export const Promote: Story = { args: { visibility: 'promote' } };
export const Private: Story = { args: { visibility: 'private' } };
