import React, { useEffect, useRef } from 'react';
import { MdTimerParse } from "../lib/timer.parser";
import { createSyntaxDiagramsCode } from "chevrotain";

interface SyntaxDiagramProps {
  className?: string;
}

export const SyntaxDiagram: React.FC<SyntaxDiagramProps> = ({ className }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const parserInstance = new MdTimerParse();
    const serializedGrammar = parserInstance.getSerializedGastProductions();
    const diagramsCode = createSyntaxDiagramsCode(serializedGrammar);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              margin: 0; 
              padding: 20px;
              background: transparent;
            }
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

    // Set the content of the iframe
    const iframe = iframeRef.current;
    iframe.srcdoc = htmlContent;
  }, []);

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: '100%',
        height: '1000px',
        border: 'none',
        background: 'transparent'
      }}
      className={className}
      title="Syntax Diagram"
    />
  );
};
