/**
 * Row-Based Card System - Story
 * 
 * Demonstrates the WodWiki editor with the inline widget card system.
 * The MarkdownEditor component includes rich markdown rendering with:
 * - Inline widget cards for headings, blockquotes, and media
 * - WOD block split view with parsed workout display
 * - Heading section folding
 * - Theme support (light/dark)
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownEditor } from '../../src/markdown-editor/MarkdownEditor';

// Sample with proper WOD syntax demonstrating various card types
const SIMPLE_CONTENT = `---
title: My Workout Log
date: 2024-01-15
tags: [crossfit, amrap, bodyweight]
---

# Morning Workout

> Remember: Consistency is more important than intensity. Show up every day.

## Warm-up

\`\`\`wod
3:00
  Arm Circles
  Leg Swings
  Inchworms
\`\`\`

## Main Workout - Cindy

This is a classic CrossFit benchmark workout.

\`\`\`wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats
\`\`\`

## Finisher

\`\`\`wod
3 Rounds
  20 Situps
  10 Burpees
\`\`\`

## Cool Down

> Take your time with the stretches. Focus on breathing.

Remember to stretch your:
- Hip flexors
- Hamstrings
- Shoulders
`;

// More complex workout example
const COMPLEX_CONTENT = `---
title: Advanced Training Session
date: 2024-01-20
author: Coach Mike
difficulty: advanced
---

# Advanced Training Session

> "The pain you feel today will be the strength you feel tomorrow." - Arnold Schwarzenegger

## Part A: Strength

\`\`\`wod
5 Rounds
  5 Back Squat @80%
  :90 Rest
\`\`\`

## Part B: Skill Work

\`\`\`wod
10:00 EMOM
  :30 Handstand Hold
  :30 Rest
\`\`\`

## Part C: Conditioning

\`\`\`wod
21-15-9
  Thrusters @95lb
  Pullups
\`\`\`

## Part D: Accessory

\`\`\`wod
3 Rounds
  15 GHD Situps
  20 Hip Extensions
  25 Banded Pull-Aparts
\`\`\`

## Notes

> Scale as needed. Quality over quantity.

Track your times and weights in your workout journal.
`;

interface RowBasedCardDemoProps {
  initialContent?: string;
  theme?: 'wod-light' | 'wod-dark';
  showToolbar?: boolean;
  readonly?: boolean;
}

const RowBasedCardDemo: React.FC<RowBasedCardDemoProps> = ({
  initialContent = SIMPLE_CONTENT,
  theme = 'wod-light',
  showToolbar = true,
  readonly = false,
}) => {
  const handleContentChange = (content: string) => {
    console.log('[RowBasedCards] Content changed, length:', content.length);
  };

  const handleBlocksChange = (blocks: any[]) => {
    console.log('[RowBasedCards] Blocks changed:', blocks.length, 'WOD blocks detected');
  };

  const handleStartWorkout = (block: any) => {
    console.log('[RowBasedCards] Start workout requested:', block);
    alert(`Starting workout: ${block.content?.substring(0, 50)}...`);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <MarkdownEditor
        initialContent={initialContent}
        theme={theme}
        showToolbar={showToolbar}
        readonly={readonly}
        onContentChange={handleContentChange}
        onBlocksChange={handleBlocksChange}
        onStartWorkout={handleStartWorkout}
        height="100%"
      />
    </div>
  );
};

const meta: Meta<typeof RowBasedCardDemo> = {
  title: 'Editor/Row-Based Cards',
  component: RowBasedCardDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The Row-Based Card System demonstrates the WodWiki editor with inline widget cards.

## Features

- **Inline Widget Cards**: Headings, blockquotes, frontmatter, and media are rendered as interactive cards
- **WOD Block Split View**: Workout blocks show parsed exercises with a "Start Workout" button
- **Heading Section Folding**: Click headings or use the "Index View" button to collapse sections
- **Theme Support**: Light and dark themes available
- **Live Parsing**: Content is parsed in real-time as you type

## Card Types

1. **Frontmatter Cards**: YAML metadata at the top of the document
2. **Heading Cards**: Section headers with fold/unfold support
3. **Blockquote Cards**: Styled quote blocks
4. **WOD Block Cards**: Workout definitions with parsed preview
        `
      }
    }
  },
  argTypes: {
    theme: {
      control: 'select',
      options: ['wod-light', 'wod-dark'],
      description: 'Editor theme',
    },
    showToolbar: {
      control: 'boolean',
      description: 'Show the toolbar with Index View toggle',
    },
    readonly: {
      control: 'boolean',
      description: 'Make the editor read-only',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: SIMPLE_CONTENT,
    theme: 'wod-light',
    showToolbar: true,
    readonly: false,
  },
};

export const DarkTheme: Story = {
  args: {
    initialContent: SIMPLE_CONTENT,
    theme: 'wod-dark',
    showToolbar: true,
    readonly: false,
  },
};

export const ComplexWorkout: Story = {
  args: {
    initialContent: COMPLEX_CONTENT,
    theme: 'wod-light',
    showToolbar: true,
    readonly: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'A more complex workout with multiple parts, demonstrating the card system with various WOD block types.'
      }
    }
  }
};

export const ReadOnly: Story = {
  args: {
    initialContent: SIMPLE_CONTENT,
    theme: 'wod-light',
    showToolbar: true,
    readonly: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Read-only mode for viewing workouts without editing capability.'
      }
    }
  }
};

export const NoToolbar: Story = {
  args: {
    initialContent: SIMPLE_CONTENT,
    theme: 'wod-light',
    showToolbar: false,
    readonly: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Editor without the toolbar, for a cleaner embedded experience.'
      }
    }
  }
};
