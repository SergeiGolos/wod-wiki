import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownEditor } from '../../src/markdown-editor/MarkdownEditor';

import beginnerFriendlyMarkdown from '../../wod/beginner-friendly-swimming.md?raw';

const meta: Meta<typeof MarkdownEditor> = {
  title: 'Runtime/Swimming',
  component: MarkdownEditor,
  args: {
    showToolbar: false,
    showContextOverlay: true,
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
