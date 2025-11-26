/**
 * Row-Based Card System - Story
 * 
 * Demonstrates the Monaco Card Behavior Spec implementation.
 * Uses the new RowBasedCardManager directly for testing the new card system.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import { editor as monacoEditor } from 'monaco-editor';
import { RowBasedCardManager } from '../../src/editor/inline-cards/RowBasedCardManager';
import '../../src/editor/inline-cards/row-cards.css';

// Sample demonstrating the Monaco Card Behavior Spec features
const CARD_BEHAVIOR_DEMO = `---
title: Monaco Card Behavior Demo
date: 2024-01-15
author: WOD Wiki Team
---

# Heading Card Demo

Click on this heading to see the raw "# " prefix appear.
When you click away, it shows the styled heading without the hash.

## Preview vs Edit Mode

> This is a blockquote. Notice the left border accent.
> When you click inside, you'll see the "> " prefix.
> When you click away, the prefix is hidden.

### Multi-line Blockquote Card

> First line of a multi-line quote
> Second line continues the thought
> Third line wraps it up nicely

## WOD Block - 50/50 Split View

The WOD block below shows source on the left and preview on the right.
The fence lines (\`\`\`wod and \`\`\`) are hidden and replaced with a card header/footer.

\`\`\`wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Squats
\`\`\`

## Another Workout

\`\`\`wod
3 Rounds
  400m Run
  21 Kettlebell Swings
  12 Pullups
\`\`\`

# Frontmatter Card

The YAML block at the top shows as a "Document Properties" card.
The --- delimiters are hidden when not editing.
Click inside the frontmatter area to see the raw --- markers.

## Notes

- Try clicking on different elements to see edit/preview modes
- Notice how the card styling changes based on cursor position
- The 50/50 split view keeps both source and preview visible
`;

// Simple content for basic testing
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
  theme?: 'vs' | 'vs-dark';
  readonly?: boolean;
}

/**
 * Demo component that directly uses RowBasedCardManager
 * This bypasses MarkdownEditor to test the new card system in isolation
 */
const RowBasedCardDemo: React.FC<RowBasedCardDemoProps> = ({
  initialContent = SIMPLE_CONTENT,
  theme = 'vs',
  readonly = false,
}) => {
  const cardManagerRef = useRef<RowBasedCardManager | null>(null);
  const [cardCount, setCardCount] = useState(0);
  const [ruleCount, setRuleCount] = useState(0);

  const handleEditorDidMount = (
    editor: monacoEditor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    console.log('[RowBasedCardDemo] Editor mounted');
    
    // Initialize the RowBasedCardManager
    cardManagerRef.current = new RowBasedCardManager(
      editor,
      (cardId, action, payload) => {
        console.log('[RowBasedCardDemo] Card action:', cardId, action, payload);
        if (action === 'start-workout') {
          alert(`Starting workout from card: ${cardId}`);
        }
      }
    );
    
    // Update stats
    setTimeout(() => {
      const cards = cardManagerRef.current?.getCards() || [];
      setCardCount(cards.length);
      setRuleCount(cards.reduce((sum, c) => sum + c.rules.length, 0));
    }, 200);
    
    // Log parsed cards for debugging
    setTimeout(() => {
      const cards = cardManagerRef.current?.getCards() || [];
      console.log('[RowBasedCardDemo] Parsed cards:', cards);
      for (const card of cards) {
        console.log(`  - ${card.cardType} @ line ${card.sourceRange.startLineNumber}:`, {
          rules: card.rules.map(r => r.overrideType),
          isEditing: card.isEditing,
        });
      }
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cardManagerRef.current?.dispose();
    };
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Stats bar */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm border-b flex gap-4">
        <span>Cards: <strong>{cardCount}</strong></span>
        <span>Rules: <strong>{ruleCount}</strong></span>
        <span className="text-gray-500">Click on headings, blockquotes, or WOD blocks to see edit mode</span>
      </div>
      
      <div className="flex-1">
        <Editor
          defaultLanguage="markdown"
          defaultValue={initialContent}
          theme={theme}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            wordWrap: 'on',
            fontSize: 14,
            readOnly: readonly,
            scrollBeyondLastLine: false,
            glyphMargin: true,
          }}
          onMount={handleEditorDidMount}
        />
      </div>
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
The Row-Based Card System implements the Monaco Card Behavior Spec.
This story directly uses RowBasedCardManager for testing the new card architecture.

## Card Behavior Matrix

| Card Type | Delimiter Lines | Content Lines | Overlay |
|-----------|----------------|---------------|---------|
| **Heading** | \`#\` styled small when not editing | Styled text | None |
| **Blockquote** | \`>\` styled small when not editing | Styled + left border | None |
| **Front Matter** | \`---\` styled minimal + ViewZone header/footer | Styled properties | None |
| **WOD Block** | Fences styled minimal + ViewZone header/footer | 50% width + styled | 50% right preview |

## Preview vs Edit Mode

- **Preview Mode**: When cursor is OUTSIDE the card, decorations are applied
- **Edit Mode**: When cursor is INSIDE the card, raw markdown is shown

## Key Features

1. **Heading Cards**: Click to see raw \`#\` prefix, click away for styled heading
2. **Blockquote Cards**: Left border accent, multi-line support with card wrapper
3. **Frontmatter Cards**: \`---\` delimiters styled minimal, "Document Properties" header shown
4. **WOD Block Cards**: 50/50 split with source on left, parsed preview on right
        `
      }
    }
  },
  argTypes: {
    theme: {
      control: 'select',
      options: ['vs', 'vs-dark'],
      description: 'Editor theme',
    },
    readonly: {
      control: 'boolean',
      description: 'Make the editor read-only',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const CardBehaviorDemo: Story = {
  args: {
    initialContent: CARD_BEHAVIOR_DEMO,
    theme: 'vs',
    readonly: false,
  },
  parameters: {
    docs: {
      description: {
        story: `
Demonstrates the Monaco Card Behavior Spec:
- Click on headings to see edit mode (raw \`#\` visible)
- Click on blockquotes to see edit mode (raw \`>\` visible)
- Click inside frontmatter to see the \`---\` delimiters  
- WOD blocks always show 50/50 split with preview
        `
      }
    }
  }
};

export const Default: Story = {
  args: {
    initialContent: SIMPLE_CONTENT,
    theme: 'vs',
    readonly: false,
  },
};

export const DarkTheme: Story = {
  args: {
    initialContent: SIMPLE_CONTENT,
    theme: 'vs-dark',
    readonly: false,
  },
};

export const ComplexWorkout: Story = {
  args: {
    initialContent: COMPLEX_CONTENT,
    theme: 'vs',
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
    theme: 'vs',
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
