import type { Meta, StoryObj } from '@storybook/react';
import { WodContainer } from '../src/components/WodContainer';
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

const meta: Meta<typeof WodContainer> = {
  title: 'Components/Wiki',
  component: WodContainer,
  parameters: {
    controls: { hideNoControlsWarning: true },
    showPanel: false
  }
};

export default meta;
export type WodStory = StoryObj<typeof WodContainer>;

export const Empty: WodStory = {
  args: {
    code: '',        
  },
};

export const Countdown: WodStory = {
  args: {
    code: `20:00 Work`,
  },
};  

export const Emom: WodStory = {
  args: {
    code: `(30) 1:00 Work`,
  },
};


export const IronBlackJack: WodStory = {
  args: {
    code:`(30) 1:00
  10 Macebell Touchdowns @30lb
  6 KB swings @106lb
  3 Deadlifts @235lb`
  },
};