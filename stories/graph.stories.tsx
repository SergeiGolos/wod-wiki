import type { Meta, StoryObj } from '@storybook/react';
import { MdTimerParse } from "../src/lib/timer.parser";
import { createSyntaxDiagramsCode } from "chevrotain";
import { SyntaxDiagram } from '../src/components/SyntaxDiagram';
import React from 'react';

const meta: Meta<typeof SyntaxDiagram> = {
  title: 'Syntax/Diagram',
  component: SyntaxDiagram,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ 
        margin: '2em', 
        // minHeight: '480px',
        minWidth: '600px',
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SyntaxDiagram>;

export const Default: Story = {
  args: {}
};
