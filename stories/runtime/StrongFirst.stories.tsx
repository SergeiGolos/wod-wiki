import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedWorkbench } from '../../src/components/layout/UnifiedWorkbench';

import simpleAndSinisterMarkdown from '../../wod/simple-and-sinister.md?raw';
import kbAxeHeavyMarkdown from '../../wod/kb-axe-heavy.md?raw';
import kbAxeLiteMarkdown from '../../wod/kb-axe-lite.md?raw';

const meta: Meta<typeof UnifiedWorkbench> = {
  title: 'Examples/StrongFirst',
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

export const SimpleAndSinister = createStory(simpleAndSinisterMarkdown, 'wod/simple-and-sinister.md');
export const KBAxeHeavy = createStory(kbAxeHeavyMarkdown, 'wod/kb-axe-heavy.md');
export const KBAxeLite = createStory(kbAxeLiteMarkdown, 'wod/kb-axe-lite.md');
