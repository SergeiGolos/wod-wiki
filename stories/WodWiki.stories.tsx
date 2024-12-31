import type { Meta, StoryObj } from '@storybook/react';
import { WodRunner } from '../src/components/runtime/WodRunner';
import React from 'react';

// Initialize Monaco editor
if (typeof window !== 'undefined') {
  self.MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      const workers: { [key: string]: string } = {
        editorWorkerService: 'monaco-editor/esm/vs/editor/editor.worker?worker',
        markdown: 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js'
      };
      return workers[label] || workers.editorWorkerService;
    }
  };
}

const meta: Meta<typeof WodRunner> = {
  title: 'Components/Wiki',
  component: WodRunner,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '400px', width: '800px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
export type WodStory = StoryObj<typeof WodRunner>;

export const Empty: WodStory = {
  args: {
    code: '',    
    current: 0
  },
};

export const Countdown: WodStory = {
  args: {
    code: `# Countdown
  :10 Get Ready
  20:00 Work`,
  },
};  

export const Emom: WodStory = {
  args: {
    code:`# EMOM 
:10 Get Ready
(30) 1:00 Work`,
  },
};


export const IronBlackJack: WodStory = {
  args: {
    code:`# Iron Black Jack 
:10 Get Ready
(30) 1:00
  10 Macebell Touchdowns @30lb
  6 KB swings @106lb
  3 Deadlifts @235lb`
  },
};