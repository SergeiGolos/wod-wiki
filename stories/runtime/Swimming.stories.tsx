import type { Meta, StoryObj } from '@storybook/react';
import { WodWorkbench } from '../../src/components/layout/WodWorkbench';

import beginnerFriendlyMarkdown from '../../wod/beginner-friendly-swimming.md?raw';

const meta: Meta<typeof WodWorkbench> = {
  title: 'Runtime/Swimming',
  component: WodWorkbench,
  args: {
    showToolbar: false,
    showContextOverlay: false,
    readonly: true,
    theme: 'vs',
    height: '85vh'
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
