import { Meta, StoryObj } from "@storybook/html";
import { MdTimerParse } from "../src/lib/timer.parser";
import { createSyntaxDiagramsCode } from "chevrotain";

// extract the serialized grammar.

const meta = {
  title: "Language",
  render: (args) => {
    var parserInstance = new MdTimerParse()
    var serialziedGrammar = parserInstance.getSerializedGastProductions()    
    console.log('Serialized Grammar:', serialziedGrammar)
    var diagramsCode = createSyntaxDiagramsCode(serialziedGrammar)    
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { margin: 0; padding: 20px; }
            .railroad-diagram {
              margin: 10px;
              background: white;
            }
            .railroad-diagram path {
              stroke-width: 2;
              stroke: black;
              fill: rgba(0,0,0,0);
            }
            .railroad-diagram text {
              font: bold 14px monospace;
              text-anchor: middle;
            }
            .railroad-diagram rect {
              stroke-width: 2;
              stroke: black;
              fill: white;
            }
          </style>
        </head>
        <body>
          ${diagramsCode}
        </body>
      </html>
    `;
    
    const container = document.createElement("iframe");
    container.style.width = '100%';
    container.style.height = '1000px';
    container.style.border = 'none';
    
    // Important: Wait for the iframe to load before setting content
    container.onload = () => {
      const doc = container.contentDocument || container.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
    };
    
    return container;   
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Graph: Story = {
  args: {
    // Add your graph-specific args here
  }
};
