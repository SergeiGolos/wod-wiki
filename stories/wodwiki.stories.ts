import type { Meta, StoryObj } from "@storybook/html";
import { action } from "@storybook/addon-actions";
import type { WodWikiProps } from "../src/wodwiki";
import { createWodWiki } from "../src/wodwiki";
import '../src/monaco-setup';
import * as monaco from 'monaco-editor';

const meta = {
  title: "Example/WodWiki",
  render: (args) => {
    // Create container for both editor and JSON view
    const container = document.createElement("div");
    container.style.display = 'flex';
    container.style.gap = '1rem';
    container.style.padding = '1rem';        

    const jsonContainer = document.createElement("div");
    jsonContainer.style.flex = '1';
    jsonContainer.style.minWidth = '300px';
    jsonContainer.style.overflow = 'auto';
    jsonContainer.style.backgroundColor = '#FEFEFE';
    jsonContainer.style.color = '#333';
    jsonContainer.style.padding = '1rem';
    jsonContainer.style.fontFamily = 'monospace';
    container.appendChild(jsonContainer);


    args.onValueChange = (value, editor) => {
      jsonContainer.innerHTML = '';
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify([value.outcome, value.parser, ], null, 2);
      jsonContainer.appendChild(pre);
      
      if (value.parser && value.parser._errors) {
        // Convert parser errors to Monaco markers
        const markers = value.parser._errors.map((er: any) => ({
          severity: monaco.MarkerSeverity.Error,
          message: er.message || 'Syntax error',
          startLineNumber: er.token.startLine,
          startColumn: er.token.startColumn,
          endLineNumber: er.token.endLine,
          endColumn: er.token.endColumn
        }));

        // Set markers on the model
        monaco.editor.setModelMarkers(
          editor.getModel(),
          'syntax',
          markers
        );
      } else {
        // Clear markers when there are no errors
        monaco.editor.setModelMarkers(editor.getModel(), 'syntax', []);
      }
      
      //console.log('onValueChange', value);
    };
    
    // Create the editor
    const editorContainer = createWodWiki(args);
    editorContainer.style.flex = '1';    
    container.prepend(editorContainer);    //container.appendChild(editorContainer);


        // Create JSON view container
    
    // Update JSON view when editor changes
    const originalOnValueChange = args.onValueChange;
    args.onValueChange = (value, editor) => {
      jsonContainer.innerHTML = '';
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(value, null, 2);

     
      jsonContainer.appendChild(pre);
      originalOnValueChange?.(value, editor);
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