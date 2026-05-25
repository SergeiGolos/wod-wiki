/**
 * Preview-Chromecast Stories
 *
 * Showcases the Chromecast receiver preview panel that is rendered on the TV
 * screen when a note is loaded but no runtime is active.  The panel is driven
 * by `WorkbenchDisplayState.previewData` from `ChromecastProxyRuntime`, so no
 * runtime object is needed — stories use pre-built JSON fixtures that match
 * the exact wire format.
 *
 * Now uses the real `ReceiverPreviewPanel` from `@/panels/preview-panel-chromecast`.
 *
 * States illustrated:
 *  1. Default         — typical preview with several workout blocks
 *  2. ManyBlocks      — 20+ blocks to verify scrolling behaviour
 *  3. SingleBlock     — only one workout block
 *  4. EmptyBlocks     — no blocks at all (defensive state)
 *  5. LongContent     — blocks with very long contentPreview (text wrapping)
 *  6. FirstFocused    — first block in D-Pad focused state
 *  7. LastFocused     — last block in D-Pad focused state
 *  8. MixedHints      — blocks with timer hints, dialect badges, and step counts
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { cn } from '@/lib/utils';
import { ReceiverPreviewPanel } from '@/panels/preview-panel-chromecast';

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirror RpcWorkbenchUpdate from RpcMessages)
// ─────────────────────────────────────────────────────────────────────────────

interface PreviewBlock {
  id: string;
  title: string;
  statementCount: number;
  contentPreview?: string;
  timerHint?: string;
  dialect?: string;
}

interface PreviewData {
  title: string;
  blocks: PreviewBlock[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Story wrapper — wraps the panel in a TV-like frame
// ─────────────────────────────────────────────────────────────────────────────

interface PreviewChromecastHarnessProps {
  previewData: PreviewData;
  /** Simulate the dark TV background (CastApp applies bg-black globally) */
  darkBackground?: boolean;
  /** If set, simulates D-Pad focus on this block index */
  focusedIndex?: number | null;
  /** Called when a block is selected ( Enter / Select pressed ) */
  onSelectBlock?: (index: number, blockId: string) => void;
}

const PreviewChromecastHarness: React.FC<PreviewChromecastHarnessProps> = ({
  previewData,
  darkBackground = true,
  focusedIndex = null,
  onSelectBlock,
}) => {
  // Simulate spatial-nav props so we can show focused/unfocused states
  // without needing a real useSpatialNavigation instance in Storybook.
  const mockGetFocusProps = (id: string) => {
    const index = parseInt(id.replace('preview-block-', ''), 10);
    const isFocused = focusedIndex !== null && index === focusedIndex;
    return {
      'data-nav-id': id,
      'data-nav-focused': isFocused,
      tabIndex: 0,
      ref: () => {},
      onClick: () => {
        const block = previewData.blocks[index];
        if (block && onSelectBlock) {
          onSelectBlock(index, block.id);
        }
      },
    };
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center w-full',
        darkBackground ? 'bg-black' : 'bg-background',
      )}
      style={{ minHeight: '600px', aspectRatio: '16/9' }}
    >
      <div className="w-full h-full" style={{ minHeight: '600px' }}>
        <ReceiverPreviewPanel
          previewData={previewData}
          getFocusProps={mockGetFocusProps}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta<typeof PreviewChromecastHarness> = {
  title: 'catalog/templates/Preview/Chromecast',
  component: PreviewChromecastHarness,
  parameters: {
    layout: 'fullscreen',
    subsystem: 'chromecast',
    docs: {
      description: {
        component:
          'Chromecast TV preview panel using the real `ReceiverPreviewPanel` from ' +
          '`@/panels/preview-panel-chromecast`. Populated with static fixture data ' +
          'matching the `WorkbenchDisplayState.previewData` wire format. ' +
          'Because the Chromecast receiver gets these objects over WebRTC, stories ' +
          'bypass the runtime entirely and drive the panel with pre-built JSON.',
      },
    },
  },
  argTypes: {
    darkBackground: {
      control: 'boolean',
      description: 'Show the dark TV background',
    },
    focusedIndex: {
      control: { type: 'number', min: -1 },
      description: 'Index of the block to show in D-Pad focused state (-1 for none)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Typical workout with several blocks */
const DEFAULT_PREVIEW_DATA: PreviewData = {
  title: 'Fran',
  blocks: [
    {
      id: 'blk-1',
      title: '21 Thrusters @ 95 lb',
      statementCount: 2,
      contentPreview: 'Thrusters\nPull-ups',
      timerHint: undefined,
      dialect: 'wod',
    },
    {
      id: 'blk-2',
      title: '21 Pull-ups',
      statementCount: 1,
      contentPreview: 'Pull-ups',
    },
    {
      id: 'blk-3',
      title: '15 Thrusters @ 95 lb',
      statementCount: 2,
      contentPreview: 'Thrusters\nPull-ups',
    },
    {
      id: 'blk-4',
      title: '15 Pull-ups',
      statementCount: 1,
      contentPreview: 'Pull-ups',
    },
    {
      id: 'blk-5',
      title: '9 Thrusters @ 95 lb',
      statementCount: 2,
      contentPreview: 'Thrusters\nPull-ups',
    },
    {
      id: 'blk-6',
      title: '9 Pull-ups',
      statementCount: 1,
      contentPreview: 'Pull-ups',
    },
  ],
};

/** Many blocks to force scrolling */
const MANY_BLOCKS_DATA: PreviewData = {
  title: 'Hero WOD Marathon',
  blocks: Array.from({ length: 24 }, (_, i) => ({
    id: `blk-many-${i}`,
    title: `Block ${i + 1}: ${['Thrusters', 'Pull-ups', 'Push-ups', 'Air Squats', 'Deadlifts', 'Box Jumps'][i % 6]}`,
    statementCount: (i % 4) + 1,
    contentPreview: `Set ${i + 1}\nReps: ${(i % 10) + 5}`,
    timerHint: i % 3 === 0 ? `${(i % 10) + 1}:00` : undefined,
    dialect: i % 4 === 0 ? 'log' : 'wod',
  })),
};

/** Single block */
const SINGLE_BLOCK_DATA: PreviewData = {
  title: 'Sprint Session',
  blocks: [
    {
      id: 'blk-solo',
      title: '400m Run',
      statementCount: 1,
      contentPreview: 'Run 400 meters as fast as possible.',
      timerHint: '2:00',
    },
  ],
};

/** Empty blocks — defensive state */
const EMPTY_BLOCKS_DATA: PreviewData = {
  title: 'Untitled Workout',
  blocks: [],
};

/** Long content previews to test text wrapping / line-clamp */
const LONG_CONTENT_DATA: PreviewData = {
  title: 'Complex EMOM',
  blocks: [
    {
      id: 'blk-long-1',
      title: 'Minute 1: Snatch Complex',
      statementCount: 5,
      contentPreview:
        'Power Snatch\nHang Snatch\nFull Snatch\nOverhead Squat x 2\nThen rest remainder of minute.',
    },
    {
      id: 'blk-long-2',
      title: 'Minute 2: Clean & Jerk Ladder',
      statementCount: 8,
      contentPreview:
        'Clean\nFront Squat\nJerk\nAdd weight every round.\nStart at 135 lb and increase by 10 lb each minute.',
    },
    {
      id: 'blk-long-3',
      title: 'Minute 3: Gymnastics Skill',
      statementCount: 4,
      contentPreview:
        'Muscle-up progression\nChest-to-bar pull-ups\nRing dips\nRest remainder of minute.',
    },
  ],
};

/** Mixed timer hints, dialect badges, and step counts */
const MIXED_HINTS_DATA: PreviewData = {
  title: 'Mixed Modality',
  blocks: [
    { id: 'blk-mix-1', title: 'Warm-up Row', statementCount: 1, timerHint: '5:00', dialect: 'wod' },
    { id: 'blk-mix-2', title: 'Strength: Back Squat', statementCount: 6, dialect: 'log' },
    { id: 'blk-mix-3', title: 'EMOM 10', statementCount: 3, timerHint: '10:00' },
    { id: 'blk-mix-4', title: 'AMRAP 12', statementCount: 5, timerHint: '12:00', dialect: 'plan' },
    { id: 'blk-mix-5', title: 'Cool-down Stretch', statementCount: 4 },
  ],
};

/** Very long title — tests text wrapping and truncation at TV distance */
const LONG_TITLE_DATA: PreviewData = {
  title: 'Advanced Olympic Weightlifting Complex: Snatch Balance + Hang Power Snatch + Full Squat Snatch with Overhead Squat Development',
  blocks: [
    {
      id: 'blk-lt-1',
      title: 'Snatch Balance',
      statementCount: 3,
      contentPreview: '3-position snatch balance\nDrop under the bar aggressively',
      timerHint: '15:00',
    },
    {
      id: 'blk-lt-2',
      title: 'Hang Power Snatch',
      statementCount: 2,
      contentPreview: 'Above-knee hang\nExplosive extension',
    },
  ],
};

/** Empty title — defensive state when title is missing */
const NO_TITLE_DATA: PreviewData = {
  title: '',
  blocks: [
    {
      id: 'blk-nt-1',
      title: 'Untitled Block A',
      statementCount: 2,
      contentPreview: '10 Push-ups\n10 Sit-ups',
    },
    {
      id: 'blk-nt-2',
      title: 'Untitled Block B',
      statementCount: 1,
      contentPreview: '400m Run',
      timerHint: '2:00',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default preview — typical workout with several blocks.
 */
export const Default: Story = {
  name: 'Default (Several Blocks)',
  args: {
    previewData: DEFAULT_PREVIEW_DATA,
    darkBackground: true,
    focusedIndex: -1,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * Many blocks — forces the list to scroll.
 * AC: Scroll container shows scrollbar and all blocks remain accessible.
 */
export const ManyBlocks: Story = {
  name: 'Many Blocks (Scrolling)',
  args: {
    previewData: MANY_BLOCKS_DATA,
    darkBackground: true,
    focusedIndex: -1,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * Single block — minimal preview with only one workout block.
 */
export const SingleBlock: Story = {
  name: 'Single Block',
  args: {
    previewData: SINGLE_BLOCK_DATA,
    darkBackground: true,
    focusedIndex: -1,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * Empty blocks — defensive state when no blocks are present.
 */
export const EmptyBlocks: Story = {
  name: 'Empty (Zero Blocks)',
  args: {
    previewData: EMPTY_BLOCKS_DATA,
    darkBackground: true,
    focusedIndex: -1,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * Long content — blocks with multi-line contentPreview to verify
 * line-clamp-3 truncation and layout stability.
 */
export const LongContent: Story = {
  name: 'Long Content Previews',
  args: {
    previewData: LONG_CONTENT_DATA,
    darkBackground: true,
    focusedIndex: -1,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * Mixed hints — timer hints, dialect badges, and step counts all present.
 */
export const MixedHints: Story = {
  name: 'Mixed Hints & Badges',
  args: {
    previewData: MIXED_HINTS_DATA,
    darkBackground: true,
    focusedIndex: -1,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * First block focused — D-Pad focus ring on the first list item.
 * Verifies `data-[nav-focused=true]` Tailwind variant and scale transform.
 */
export const FirstFocused: Story = {
  name: 'First Block (D-Pad Focused)',
  args: {
    previewData: DEFAULT_PREVIEW_DATA,
    darkBackground: true,
    focusedIndex: 0,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * Last block focused — D-Pad focus ring on the final list item.
 * Useful for checking scroll position when focus is at the end.
 */
export const LastFocused: Story = {
  name: 'Last Block (D-Pad Focused)',
  args: {
    previewData: DEFAULT_PREVIEW_DATA,
    darkBackground: true,
    focusedIndex: DEFAULT_PREVIEW_DATA.blocks.length - 1,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * Very long title — exercises header wrapping and truncation.
 * AC: Title remains readable at TV distance without breaking layout.
 */
export const VeryLongTitle: Story = {
  name: 'Edge: Very Long Title',
  args: {
    previewData: LONG_TITLE_DATA,
    darkBackground: true,
    focusedIndex: -1,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * Empty title — defensive state when no title is provided.
 * Verifies the panel still renders blocks correctly.
 */
export const NoTitle: Story = {
  name: 'Edge: Empty Title',
  args: {
    previewData: NO_TITLE_DATA,
    darkBackground: true,
    focusedIndex: -1,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};

/**
 * Light background variant — useful for cross-theme comparison.
 */
export const LightBackground: Story = {
  name: 'Light Background Variant',
  args: {
    previewData: DEFAULT_PREVIEW_DATA,
    darkBackground: false,
    focusedIndex: 0,
    onSelectBlock: fn().mockName('onSelectBlock'),
  },
};
