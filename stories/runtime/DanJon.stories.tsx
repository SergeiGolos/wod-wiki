import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../StorybookWorkbench';
import { expect, userEvent, within } from '@storybook/test';

import abcMarkdown from '../../wod/kettlebell/abc.md?raw';
import abcSingleBellMarkdown from '../../wod/kettlebell/abc-single-bell.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/DanJon',
  component: Workbench,
  args: {
    showToolbar: false,
    showContextOverlay: false,
    readonly: true,
    theme: 'vs',
    hidePlanUnlessDebug: true
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

export const ABC: Story = {
  ...createStory(abcMarkdown, 'wod/abc.md'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Basic check to see if it runs
    await expect(canvas.getByRole('heading', { name: /Track/i, level: 2 })).toBeInTheDocument();
  }
};
export const ABCSingleBell = createStory(abcSingleBellMarkdown, 'wod/abc-single-bell.md');
