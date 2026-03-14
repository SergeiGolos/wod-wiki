import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../StorybookWorkbench';

import markdownLoopsFixed from './workouts/loops-fixed.md?raw';
import markdownLoopsForTime from './workouts/loops-for-time.md?raw';
import markdownLoopsEMOM from './workouts/loops-emom.md?raw';
import markdownLoopsAMRAP from './workouts/loops-amrap.md?raw';
import markdownLoopsTabata from './workouts/loops-tabata.md?raw';

import markdownBlocksSimple from './workouts/blocks-simple.md?raw';
import markdownBlocksNested from './workouts/blocks-nested.md?raw';
import markdownBlocksRest from './workouts/blocks-rest.md?raw';
import markdownBlocksMetadata from './workouts/blocks-metadata.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Testing/Workouts',
  component: Workbench,
  args: {
    showToolbar: false,
    readonly: true,
    theme: 'wod-light',
    hidePlanUnlessDebug: true,
    initialShowPlan: false,
    initialShowTrack: true,
    initialShowReview: true,
    initialViewMode: 'track'
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Fast-executing workout fixtures for automated and manual testing of the runtime behavior.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ── Loops Group ─────────────────────────────────────────────────────────────

export const LoopsFixed: Story = {
  name: 'Loops/Fixed Rounds',
  args: { initialContent: markdownLoopsFixed },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: stories/Testing/workouts/loops-fixed.md'
      }
    }
  }
};

export const LoopsForTime: Story = {
  name: 'Loops/For Time',
  args: { initialContent: markdownLoopsForTime },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: stories/Testing/workouts/loops-for-time.md'
      }
    }
  }
};

export const LoopsEMOM: Story = {
  name: 'Loops/EMOM',
  args: { initialContent: markdownLoopsEMOM },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: stories/Testing/workouts/loops-emom.md'
      }
    }
  }
};

export const LoopsAMRAP: Story = {
  name: 'Loops/AMRAP',
  args: { initialContent: markdownLoopsAMRAP },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: stories/Testing/workouts/loops-amrap.md'
      }
    }
  }
};

export const LoopsTabata: Story = {
  name: 'Loops/Tabata',
  args: { initialContent: markdownLoopsTabata },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: stories/Testing/workouts/loops-tabata.md'
      }
    }
  }
};

// ── Blocks Group ────────────────────────────────────────────────────────────

export const BlocksSimple: Story = {
  name: 'Blocks/Simple',
  args: { initialContent: markdownBlocksSimple },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: stories/Testing/workouts/blocks-simple.md'
      }
    }
  }
};

export const BlocksNested: Story = {
  name: 'Blocks/Nested',
  args: { initialContent: markdownBlocksNested },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: stories/Testing/workouts/blocks-nested.md'
      }
    }
  }
};

export const BlocksRest: Story = {
  name: 'Blocks/Rest',
  args: { initialContent: markdownBlocksRest },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: stories/Testing/workouts/blocks-rest.md'
      }
    }
  }
};

export const BlocksMetadata: Story = {
  name: 'Blocks/Metadata',
  args: { initialContent: markdownBlocksMetadata },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: stories/Testing/workouts/blocks-metadata.md'
      }
    }
  }
};
