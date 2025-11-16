import { MarkdownEditor } from '@/markdown-editor';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof MarkdownEditor> = {
  title: 'Markdown Editor',
  component: MarkdownEditor,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full-page markdown editor with support for WOD blocks. This is Phase 1 of the Monaco editor enhancement.'
      }
    }
  },
  argTypes: {
    initialContent: {
      control: 'text',
      description: 'Initial markdown content to display'
    },
    onContentChange: {
      action: 'contentChanged',
      description: 'Callback when content changes'
    },
    onTitleChange: {
      action: 'titleChanged',
      description: 'Callback when title (first line) changes'
    },
    showToolbar: {
      control: 'boolean',
      description: 'Whether to show markdown toolbar'
    },
    readonly: {
      control: 'boolean',
      description: 'Whether editor is read-only'
    },
    theme: {
      control: 'select',
      options: ['vs', 'vs-dark', 'hc-black'],
      description: 'Monaco editor theme'
    },
    height: {
      control: 'text',
      description: 'Height of editor'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: `# My Workout Log - ${new Date().toLocaleDateString()}

Welcome to the markdown editor with WOD block support!

## Morning Session

\`\`\`wod
20:00 AMRAP
  + 5 Pullups
  + 10 Pushups
  + 15 Squats
\`\`\`

Great workout today! Felt strong.

## Evening Session

\`\`\`wod
(21-15-9)
  Thrusters 95lb
  Pullups
\`\`\`

Classic benchmark WOD.`,
    showToolbar: false,
    readonly: false,
    theme: 'vs'
  }
};

export const WithToolbar: Story = {
  args: {
    ...Default.args,
    showToolbar: true,
    showContextOverlay: true
  }
};

export const WithContextOverlay: Story = {
  args: {
    ...Default.args,
    showContextOverlay: true
  }
};

export const NoContextOverlay: Story = {
  args: {
    ...Default.args,
    showContextOverlay: false
  }
};

export const ReadOnly: Story = {
  args: {
    ...Default.args,
    readonly: true
  }
};

export const DarkTheme: Story = {
  args: {
    ...Default.args,
    theme: 'vs-dark'
  }
};

export const Empty: Story = {
  args: {
    initialContent: '',
    showToolbar: false
  }
};

export const SingleWodBlock: Story = {
  args: {
    initialContent: `# Today's WOD

\`\`\`wod
For Time:
  100 Burpees
\`\`\`

Rest well after this one!`
  }
};

export const MultipleWodBlocks: Story = {
  args: {
    initialContent: `# Training Day

## Warm-up
\`\`\`wod
5:00
  Jump rope
  Dynamic stretching
\`\`\`

## Main WOD
\`\`\`wod
20:00 AMRAP
  + 5 Pullups
  + 10 Pushups
  + 15 Squats
\`\`\`

## Cool Down
\`\`\`wod
10:00
  Light jog
  Static stretching
\`\`\`

Notes: Great session, pushed hard!`
  }
};

export const WithComplexMarkdown: Story = {
  args: {
    initialContent: `# Workout Journal - Week 47

## Goals for this week
- [ ] 3 strength sessions
- [ ] 2 conditioning sessions
- [x] Mobility work daily

## Monday - 11/13/2024

**Weather:** Sunny, 72°F  
**Energy Level:** 8/10  
**Sleep:** 7 hours

### Main Workout
\`\`\`wod
(15) :60 EMOM
  + 3 Deadlifts 315lb
  + 6 Hang Power Cleans 185lb
  + 9 Front Squats 135lb
\`\`\`

#### Notes
- Felt great today
- Form was solid on all lifts
- Need to work on breathing during EMOM

### Accessories
1. Bicep curls 3x10
2. Tricep extensions 3x10
3. Core work - planks

---

## Resources
- [Workout programming guide](https://example.com)
- Check out **CrossFit** workouts`
  }
};
