/**
 * Row-Based Card System - Story
 * 
 * Demonstrates the new row override card architecture
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { RowBasedCardManager } from '@/editor/inline-cards/RowBasedCardManager';

// Simple sample without code blocks for initial testing
const SIMPLE_CONTENT = `---
title: My Workout Log
date: 2024-01-15
---

# Morning Workout

> Remember: Consistency is more important than intensity.

## Warm-up

Some warm-up exercises go here.

## Main Workout

The main workout content.

## Cool Down

Remember to stretch!
`;

interface RowBasedCardDemoProps {
  initialContent?: string;
  theme?: 'vs' | 'vs-dark';
}

const RowBasedCardDemo: React.FC<RowBasedCardDemoProps> = ({
  initialContent = SIMPLE_CONTENT,
  theme = 'vs',
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const managerRef = useRef<RowBasedCardManager | null>(null);
  const [cardCount, setCardCount] = useState(0);
  const [ruleCount, setRuleCount] = useState(0);

  const handleEditorMount = (
    editorInstance: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = editorInstance;

    // Create the row-based card manager
    managerRef.current = new RowBasedCardManager(
      editorInstance,
      (cardId, action, payload) => {
        console.log('Card action:', { cardId, action, payload });
        
        if (action === 'start-workout') {
          alert('Starting workout from card: ' + cardId);
        }
      }
    );

    // Update stats
    const updateStats = () => {
      if (managerRef.current) {
        const cards = managerRef.current.getCards();
        setCardCount(cards.length);
        setRuleCount(cards.reduce((sum, c) => sum + c.rules.length, 0));
      }
    };

    // Initial stats
    setTimeout(updateStats, 500);

    // Update on content change
    editorInstance.onDidChangeModelContent(() => {
      setTimeout(updateStats, 200);
    });
  };

  useEffect(() => {
    return () => {
      managerRef.current?.dispose();
    };
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <div className="px-4 py-2 bg-muted border-b flex items-center gap-4 text-sm">
        <span className="font-medium">Row-Based Card System Demo</span>
        <span className="text-muted-foreground">
          Cards: <span className="font-mono">{cardCount}</span>
        </span>
        <span className="text-muted-foreground">
          Rules: <span className="font-mono">{ruleCount}</span>
        </span>
        <button
          className="ml-auto px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90"
          onClick={() => managerRef.current?.refresh()}
        >
          Refresh
        </button>
      </div>

      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          defaultValue={initialContent}
          theme={theme}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            lineHeight: 22,
            padding: { top: 16, bottom: 16 },
            minimap: { enabled: false },
            lineNumbers: 'on',
            folding: false,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
          }}
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
  },
  argTypes: {
    theme: {
      control: 'select',
      options: ['vs', 'vs-dark'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: SIMPLE_CONTENT,
    theme: 'vs',
  },
};

export const DarkTheme: Story = {
  args: {
    initialContent: SIMPLE_CONTENT,
    theme: 'vs-dark',
  },
};
