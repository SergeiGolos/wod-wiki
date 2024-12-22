import { Meta, StoryObj } from "@storybook/html";
import { MdTimerParse } from "../src/lib/timer.parser";
import { createSyntaxDiagramsCode } from "chevrotain";

// extract the serialized grammar.

const meta = {
  title: "Language",
  render: (args) => {
    var parserInstance = new MdTimerParse()
    var serialziedGrammar = parserInstance.getSerializedGastProductions()    
    var htmlText = createSyntaxDiagramsCode(serialziedGrammar)    
    const container = document.createElement("iframe") as HTMLIFrameElement;    
    container.src = 'data:text/html;charset=utf-8,' + encodeURI(htmlText);
    container.style.width = '100%';
    container.style.height = '1000px';
    container.frameBorder = '0';
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
