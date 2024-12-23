import type { Meta, StoryObj } from "@storybook/html";
import { action } from "@storybook/addon-actions";
import type { WodWikiProps } from "../src/wodwiki";
import { createWodWiki } from "../src/wodwiki";
import '../src/monaco-setup';

const meta = {
  title: "Example/WodWiki",
  render: (args) => {
    // Create container for both editor and JSON view
    const container = document.createElement("div");
    container.style.display = 'flex';
    container.style.gap = '1rem';
    container.style.padding = '1rem';
    container.style.height = '400px';
    

    const jsonContainer = document.createElement("div");
    jsonContainer.style.flex = '1';
    jsonContainer.style.minWidth = '300px';
    jsonContainer.style.overflow = 'auto';
    jsonContainer.style.backgroundColor = '#FEFEFE';
    jsonContainer.style.color = '#333';
    jsonContainer.style.padding = '1rem';
    jsonContainer.style.fontFamily = 'monospace';
    container.appendChild(jsonContainer);


    args.onValueChange = (value) => {
      jsonContainer.innerHTML = '';
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(value.outcome, null, 2);
      jsonContainer.appendChild(pre);
      //console.log('onValueChange', value);
    };
    
    // Create the editor
    const editorContainer = createWodWiki(args);
    editorContainer.style.flex = '1';    
    container.prepend(editorContainer);    //container.appendChild(editorContainer);


        // Create JSON view container
    
    // Update JSON view when editor changes
    const originalOnValueChange = args.onValueChange;
    args.onValueChange = (value) => {
      jsonContainer.innerHTML = '';
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(value, null, 2);
      jsonContainer.appendChild(pre);
      originalOnValueChange?.(value);
    };

    return container;
  },
  argTypes: {
    code: { control: "text" },
  },
  args: {
    onValueChange: action("onValueChange"),
    onCursorMoved: action("onCursorMoved"),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<WodWikiProps>;

export default meta;
type Story = StoryObj<WodWikiProps>;

export const Countdown: Story = {
  args: {
    code: `-:10 ready
-20:00 Work`,
  },
};

export const Emom: Story = {
  args: {
    code:`-10(ready)
30 -1:00 Work`,
  },
};