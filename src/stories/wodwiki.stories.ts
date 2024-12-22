import type { Meta, StoryObj } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import type { WodWikiProps } from './wodwiki';
import { createWodWiki } from './wodwiki';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Example/WodWiki',
  tags: ['autodocs'],
  render: (args) => {
    // You can either use a function to create DOM elements or use a plain html string!
    // return `<div>${label}</div>`;
    return createWodWiki(args);
  },
  argTypes: {
    code: { control: 'textarea' },    
  },
  // Use `action` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { 
    onValueChange: action('onValueChange'),
    onCursorMoved: action('onCursorMoved') 
  },
} satisfies Meta<WodWikiProps>;

export default meta;
type Story = StoryObj<WodWikiProps>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {    
    code: 'Button',
  },
};