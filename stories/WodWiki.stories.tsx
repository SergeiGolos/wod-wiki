import type { Meta, StoryObj } from '@storybook/react';
import { WodWiki } from '../src/components/WodWiki';
import React, { useState } from 'react';
import { WodRows } from '../src/components/WodRows';

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


const WodWikiWrapper = ({ args }: { args: any }) => {
  const [outcome, setOutcome] = useState<any[]>([]);

  const handleValueChange = (value: any) => {
    if (value?.outcome) {
      // If we get an empty outcome array, show empty state
      if (value.outcome.length === 0) {
        setOutcome([]);
        return;
      }
      
      // Only update if we're getting real parsed data, not just the compiling status
      if (!(value.outcome.length === 1 && value.outcome[0].type === 'notification')) {
        setOutcome(value.outcome);
      }
    }
  };

  console.log('Current outcome:', outcome); // Add this for debugging

  return (
    <div className="flex flex-col gap-4 min-h-[600px] w-[800px] p-4">
      <WodWiki {...args} onValueChange={handleValueChange} />
      <WodRows data={outcome} />
    </div>
  );
};

const meta: Meta<typeof WodWiki> = {
  title: 'Components/WodWiki',
  component: WodWiki,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
    }
  },
  decorators: [
    (Story, context) => <WodWikiWrapper args={context.args} />
  ],  
};

export default meta;
type Story = StoryObj<typeof WodWiki>;

export const Empty: Story = {
  args: {
    code: '',
  },
};

export const Countdown: Story = {
  args: {
    code: `# Countdown
  -:10 Get Ready
  -20:00 Work`,
  },
};  

export const Emom: Story = {
  args: {
    code:`# EMOM 
-:10 Get Ready
(30) -1:00 Work`,
  },
};

export const Simple: Story = {
  args: {
    code:`# Simple & Sinister
> Never contest for space with a kettlebell.

-:10 Get Ready

-5:00 KB Swings @70lb
-1:00 Rest
-10:00 Turkish Getups 70lb`
  },
};

export const IronBlackJack: Story = {
  args: {
    code:`# Iron Black Jack 
-:10 Get Ready
(30) -1:00
  10 Macebell Touchdowns @30lb
  6 KB swings @106lb
  3 Deadlifts @235lb`
  },
};