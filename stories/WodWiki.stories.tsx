import type { Meta, StoryObj } from '@storybook/react';
import { WodRunner } from '../src/components/WodRunner';
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
  title: 'Components/WodWiki',
  component: WodRunner,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '600px', width: '800px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WodRunner>;

export const Empty: Story = {
  args: {
    initialContent: '',    
    current: 0
  },
};

export const WithContent: Story = {
  args: {
    initialContent: `# 24.1
For Time
Complete the following complex:
* 10 Hang Power Snatch (75/55 lb)
* 10 Overhead Squats
* 10 Thrusters

Then, 3 rounds of:
* 10 Pull-Ups
* 10 Push-Ups
* 10 Air Squats`,
    current: 0
  },
};

export const WithCurrentIndex: Story = {
  args: {
    initialContent: `# 24.1
For Time
Complete the following complex:
* 10 Hang Power Snatch (75/55 lb)
* 10 Overhead Squats
* 10 Thrusters

Then, 3 rounds of:
* 10 Pull-Ups
* 10 Push-Ups
* 10 Air Squats`,
    current: 3
  },
};