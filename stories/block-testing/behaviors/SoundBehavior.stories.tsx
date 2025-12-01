/**
 * SoundBehavior Queue-Based Tests
 * 
 * Tests for SoundBehavior using the QueueTestHarness framework.
 * Migrated from src/runtime/behaviors/SoundBehavior.test.ts
 */

import type { Meta, StoryObj } from '@storybook/react';
import { QueueTestHarness, TestTemplate } from '@/runtime/testing';

const meta: Meta<typeof QueueTestHarness> = {
  title: 'Block Testing/Behaviors/Sound Behavior',
  component: QueueTestHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# SoundBehavior Tests

Tests for the SoundBehavior class which manages sound cue triggering
based on timer progress.

## Key Behaviors Tested

1. **Memory Initialization** - Sound state allocated on mount
2. **Count-up Triggering** - Sounds trigger when elapsed >= threshold
3. **Countdown Triggering** - Sounds trigger when remaining <= threshold
4. **Multiple Cues** - Cues trigger in sequence
5. **Single Trigger** - Same cue doesn't trigger twice
6. **Event Filtering** - Only responds to own block's events
7. **Reset Functionality** - Cue states can be reset
        `
      }
    }
  },
  argTypes: {
    showRuntimeView: { control: 'boolean' },
    layout: { control: 'select', options: ['horizontal', 'vertical'] }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== SOUND BEHAVIOR TEMPLATES ====================

const soundMemoryInitTemplate: TestTemplate = {
  id: 'sound-memory-init',
  name: '🧠 Memory Init',
  description: 'Verify sound state memory is allocated on mount',
  wodScript: `3:00 For Time:
  Run 400m`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (allocates sound memory)' },
  ]
};

const soundCountUpTemplate: TestTemplate = {
  id: 'sound-count-up',
  name: '⬆️ Count-up Trigger',
  description: 'Test sounds trigger when elapsed time >= threshold',
  wodScript: `For Time:
  100 Burpees`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (start timer)' },
    { type: 'tick', label: 'Tick (before threshold)' },
    { type: 'tick', label: 'Tick (at threshold - should trigger)' },
    { type: 'tick', label: 'Tick (after threshold)' },
  ]
};

const soundCountDownTemplate: TestTemplate = {
  id: 'sound-countdown',
  name: '⬇️ Countdown Trigger',
  description: 'Test sounds trigger when remaining time <= threshold',
  wodScript: `3:00 For Time:
  20 Pushups`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (start countdown)' },
    { type: 'tick', label: 'Tick (plenty of time left)' },
    { type: 'tick', label: 'Tick (approaching threshold)' },
    { type: 'tick', label: 'Tick (at threshold - should trigger)' },
  ]
};

const soundMultipleCuesTemplate: TestTemplate = {
  id: 'sound-multiple-cues',
  name: '🔔🔔 Multiple Cues',
  description: 'Test multiple cues trigger in sequence',
  wodScript: `5:00 AMRAP
  10 Air Squats`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (start timer)' },
    { type: 'tick', label: 'Tick (cue 1 threshold)' },
    { type: 'tick', label: 'Tick (cue 2 threshold)' },
    { type: 'tick', label: 'Tick (cue 3 threshold)' },
  ]
};

const soundNoDoubleTriggerTemplate: TestTemplate = {
  id: 'sound-no-double-trigger',
  name: '🚫 No Double Trigger',
  description: 'Test same cue doesn\'t trigger twice',
  wodScript: `10:00 AMRAP
  5 Pullups`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (start timer)' },
    { type: 'tick', label: 'Tick (trigger cue)' },
    { type: 'tick', label: 'Tick (past threshold - no re-trigger)' },
    { type: 'tick', label: 'Tick (still past - no re-trigger)' },
  ]
};

const soundResetTemplate: TestTemplate = {
  id: 'sound-reset',
  name: '🔄 Reset Cues',
  description: 'Test cue states can be reset',
  wodScript: `5:00 EMOM
  3 Deadlifts`,
  queue: [
    { type: 'push', label: 'Push Timer Block', statementIndex: 0, includeChildren: true },
    { type: 'mount', label: 'Mount (start timer)' },
    { type: 'tick', label: 'Tick (trigger cues)' },
    { type: 'custom', label: 'Reset Sound Cues', params: { action: 'reset-sound' } },
    { type: 'tick', label: 'Tick (cues can trigger again)' },
  ]
};

// ==================== STORIES ====================

export const Default: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    customTemplates: [
      soundMemoryInitTemplate,
      soundCountUpTemplate,
      soundCountDownTemplate,
      soundMultipleCuesTemplate,
      soundNoDoubleTriggerTemplate,
      soundResetTemplate,
    ],
    initialTemplate: soundMemoryInitTemplate
  },
  parameters: {
    docs: {
      description: {
        story: 'All SoundBehavior tests available via template selection.'
      }
    }
  }
};

export const MemoryInitialization: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: soundMemoryInitTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Memory Initialization

Verifies sound state memory is allocated on mount.

**Expected:**
- After mount, memory contains sound state references
- All cues initialized as not triggered
        `
      }
    }
  }
};

export const CountUpTrigger: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: soundCountUpTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Count-up Sound Trigger

Tests sounds trigger when elapsed time >= threshold.

**Expected:**
- Sound not triggered before threshold
- Sound triggers when elapsed time reaches threshold
- \`triggered\` flag set to true
- \`triggeredAt\` timestamp recorded
        `
      }
    }
  }
};

export const CountdownTrigger: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: soundCountDownTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Countdown Sound Trigger

Tests sounds trigger when remaining time <= threshold.

**Expected:**
- Sound not triggered with plenty of time remaining
- Sound triggers when remaining time drops to threshold
- Useful for "10 seconds remaining" warnings
        `
      }
    }
  }
};

export const MultipleCues: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: soundMultipleCuesTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Multiple Cues Sequence

Tests multiple cues trigger in sequence as time progresses.

**Expected:**
- Each cue triggers at its own threshold
- Earlier cues trigger first
- Later cues trigger as time continues
        `
      }
    }
  }
};

export const NoDoubleTrigger: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: soundNoDoubleTriggerTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: No Double Trigger

Tests same cue doesn't trigger twice.

**Expected:**
- Cue triggers once at threshold
- Subsequent ticks don't re-trigger
- \`triggeredAt\` timestamp doesn't change
        `
      }
    }
  }
};

export const ResetCues: Story = {
  args: {
    showRuntimeView: true,
    layout: 'horizontal',
    initialTemplate: soundResetTemplate
  },
  parameters: {
    docs: {
      description: {
        story: `
## Test: Reset Cues

Tests cue states can be reset to allow re-triggering.

**Expected:**
- After reset, all cues have \`triggered: false\`
- Cues can trigger again after reset
- Useful for repeating intervals (EMOM)
        `
      }
    }
  }
};
