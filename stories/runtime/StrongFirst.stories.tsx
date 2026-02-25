import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench as Workbench } from '../StorybookWorkbench';
import { expect, userEvent, within, waitFor } from '@storybook/test';

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
    hidePlanUnlessDebug: true
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

    // 1. Find the "Run" button for the first WOD block in the preview
    // The first block in S&S is "5:00 100 KB Swings ?kg"
    const runButtons = await waitFor(async () => {
        const buttons = await canvas.findAllByRole('button', { name: /run/i });
        if (buttons.length === 0) throw new Error('No run buttons found');
        return buttons;
    }, { timeout: 5000 });
    await userEvent.click(runButtons[0]);

    // 2. Wait for the Track panel to initialize
    // Use a more specific selector for the heading to avoid ambiguity
    await expect(canvas.getByRole('heading', { name: /Track/i, level: 2 })).toBeInTheDocument();

    // 3. Verify Initial Timer State
    // The label "100 KB Swings" might be split into multiple spans (icon + text)
    // Use waitFor to ensure runtime has initialized and UI updated
    await waitFor(async () => {
        const label = await canvas.findByText((content, element) => {
            return element?.textContent?.includes('100 KB Swings') ?? false;
        });
        expect(label).toBeInTheDocument();
    }, { timeout: 5000 });

    // Clock should show 05:00
    await expect(canvas.getByText(/05:00/i)).toBeInTheDocument();

    // 4. Verify Runtime Stack
    // We expect "100 KB Swings" to be in the stack view
    const stackItems = canvasElement.querySelectorAll('.RuntimeStackView .font-semibold');
    expect(stackItems[0].textContent).toContain('100 KB Swings');

    // 5. Start the Timer
    const playButton = canvas.getByTitle(/play/i, { suggest: false }) || canvas.locator('.title-play').first();
    // Since 'play' is an icon inside a button, let's find the button by its action or title
    const timerButton = canvasElement.querySelector('button.relative.z-10.bg-white');
    await userEvent.click(timerButton!);

    // 6. Wait for time to pass
    await new Promise(r => setTimeout(r, 2000));
    
    // 7. Verify time changed (should be 04:58 or 04:59)
    const clockText = canvas.getByText(/04:5/i);
    await expect(clockText).toBeInTheDocument();

    // 8. Next Block (advance to the (10) sub-round)
    const nextButton = canvas.getByTitle(/Next Block/i);
    await userEvent.click(nextButton);

    // 9. Verify Stack and Label updated
    // Now it should show the (10) rounds block as the leaf
    await waitFor(() => {
        expect(canvas.getByText(/10 KB Swings/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // 10. Check Review Table
    // The parent block should have recorded some data or at least the table should be visible
    await expect(canvas.getByText(/Review/i)).toBeInTheDocument();
    const table = canvasElement.querySelector('table');
    expect(table).toBeInTheDocument();
  }
};

export const KBAxeHeavy = createStory(kbAxeHeavyMarkdown, 'wod/kb-axe-heavy.md');
export const KBAxeLite = createStory(kbAxeLiteMarkdown, 'wod/kb-axe-lite.md');
