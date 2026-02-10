import type { Meta, StoryObj } from '@storybook/react';
import { Workbench } from '../../src/components/layout/Workbench';

import beginnerFriendlyMarkdown from '../../wod/beginner-friendly-swimming.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/Swimming',
  component: Workbench,
  args: {
    showToolbar: false,
    showContextOverlay: false,
    readonly: true,
    theme: 'vs'
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Swim programming rendered via MarkdownEditor. Content is synchronized with the markdown sources in the `wod/` directory.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const BeginnerFriendlySwimming: Story = {
  args: { initialContent: beginnerFriendlyMarkdown },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: wod/beginner-friendly-swimming.md'
      }
    }
  }
};
