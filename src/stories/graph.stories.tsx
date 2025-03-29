import type { Meta, StoryObj } from '@storybook/react';
import '../index.css';
import { SyntaxDiagram } from './components/SyntaxDiagram';

const meta: Meta<typeof SyntaxDiagram> = {
  title: 'Components/Syntax Diagram',
  component: SyntaxDiagram,  
  parameters: {
    controls: { hideNoControlsWarning: true },    
    showPanel: false
  }
};

export default meta;
type Story = StoryObj<typeof SyntaxDiagram>;

export const Default: Story = {
  args: {}
};
