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
 * Source: `src/components/metrics/VisibilityBadge.tsx`
 *
 * Stories:
 *  1. AllTiers   – all four tiers side-by-side
 *  2. Display    – single display tier
 *  3. Result     – single result tier
 *  4. Promote    – single promote tier
 *  5. Private    – single private tier
 */

import type { Meta, StoryObj } from '@storybook/react';
import { VisibilityBadge } from '@/components/metrics/VisibilityBadge';
import type { MetricVisibility } from '@/runtime/memory/MetricVisibility';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof VisibilityBadge> = {
  title: 'catalog/atoms/display/VisibilityBadge',
  component: VisibilityBadge,
  parameters: { layout: 'padded', subsystem: 'chromecast' },
  argTypes: {
    visibility: {
      control: 'select',
      options: ['display', 'result', 'promote', 'private'] as MetricVisibility[],
    },
  },
};

export default meta;
type Story = StoryObj<typeof VisibilityBadge>;

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

export const CustomTier: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <VisibilityBadge visibility="promote" />
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-cyan-500 bg-cyan-500/10">
        Elite
      </span>
    </div>
  ),
};

export const HoverTooltip: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <VisibilityBadge visibility="display" />
      <p className="text-xs text-muted-foreground">Hover badge to see tooltip label.</p>
    </div>
  ),
};

export const CompactVariant: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-[10px]">
      <div className="scale-90 origin-left">
        <VisibilityBadge visibility="display" />
      </div>
      <div className="scale-90 origin-left">
        <VisibilityBadge visibility="result" />
      </div>
      <div className="scale-90 origin-left">
        <VisibilityBadge visibility="private" />
      </div>
    </div>
  ),
};
