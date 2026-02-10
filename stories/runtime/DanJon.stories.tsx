import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedWorkbench } from '../../src/components/layout/UnifiedWorkbench';

import abcMarkdown from '../../wod/abc.md?raw';
import abcSingleBellMarkdown from '../../wod/abc-single-bell.md?raw';

const meta: Meta<typeof UnifiedWorkbench> = {
  title: 'Examples/DanJon',
  component: UnifiedWorkbench,
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
        component: 'Dan John complexes rendered via MarkdownEditor using their markdown sources. This keeps the runtime demos synchronized with the curated Dan John library.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

const createStory = (content: string, source: string): Story => ({
  args: { initialContent: content },
  parameters: {
    docs: {
      description: {
        story: `Markdown source: ${source}`
      }
    }
  }
});

export const ABC = createStory(abcMarkdown, 'wod/abc.md');
export const ABCSingleBell = createStory(abcSingleBellMarkdown, 'wod/abc-single-bell.md');
