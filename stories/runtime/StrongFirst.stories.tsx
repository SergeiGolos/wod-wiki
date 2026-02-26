import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../StorybookWorkbench';
import { expect, userEvent, within, waitFor } from 'storybook/test';

import simpleAndSinisterMarkdown from '../../wod/kettlebell/simple-and-sinister.md?raw';
import kbAxeHeavyMarkdown from '../../wod/kettlebell/kb-axe-heavy.md?raw';
import kbAxeLiteMarkdown from '../../wod/kettlebell/kb-axe-lite.md?raw';

const meta: Meta<typeof Workbench> = {
  title: 'Examples/StrongFirst',
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
        component: 'StrongFirst-inspired training sessions rendered from markdown sources. Ideal for demonstrating how kettlebell-centric programming appears inside the MarkdownEditor.'
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

export const SimpleAndSinister: Story = {
  args: { initialContent: simpleAndSinisterMarkdown },
  parameters: {
    docs: {
      description: {
        story: 'Markdown source: wod/simple-and-sinister.md'
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 0. Toggle Plan panel ON first, because it starts OFF by default in Examples
    const planToggle = canvas.getByTitle(/Toggle Plan Panel/i);
    await userEvent.click(planToggle);

    // 1. Find the "Run" button for the first WOD block
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

export const KBAxeHeavy = createStory(kbAxeHeavyMarkdown, 'wod/kb-axe-heavy.md');
export const KBAxeLite = createStory(kbAxeLiteMarkdown, 'wod/kb-axe-lite.md');
