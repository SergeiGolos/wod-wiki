import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../StorybookWorkbench';
import { expect, userEvent, within, waitFor } from '@storybook/test';

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
    hidePlanUnlessDebug: true,
    initialShowPlan: false,
    initialShowTrack: true,
    initialShowReview: true
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
    
    // 0. Toggle Plan panel ON first
    const planToggle = canvas.getByTitle(/Toggle Plan Panel/i);
    await userEvent.click(planToggle);

    // 1. Find the "Run" button for the WOD block
    const runButtons = await waitFor(async () => {
        const buttons = await canvas.findAllByRole('button', { name: /run/i });
        if (buttons.length === 0) throw new Error('No run buttons found');
        return buttons;
    }, { timeout: 5000 });
    await userEvent.click(runButtons[0]);

    // 2. Wait for the Track panel (clock) to appear
    await waitFor(() => {
        const clockPanel = canvasElement.querySelector('#tutorial-track-clock');
        expect(clockPanel).toBeInTheDocument();
    }, { timeout: 5000 });
  }
};
export const ABCSingleBell = createStory(abcSingleBellMarkdown, 'wod/abc-single-bell.md');
