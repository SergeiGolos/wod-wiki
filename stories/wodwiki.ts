import * as monaco from 'monaco-editor';

export interface WodWikiProps {  
    /** What background color to use */
    code?: string;
    /** Optional value change handler */
    onValueChange?: (value: string) => void;
    /** Optional cursor position handler */
    onCursorMoved?: (position: monaco.Position) => void;
}

/** Primary UI component for user interaction */
export const createWodWiki = ({
    code = "medium",    
    onValueChange,
    onCursorMoved,
}: WodWikiProps) => {
    
    const container = document.createElement("div");
    container.style.height = '400px';
    container.style.width = '600px';    
    document.body.appendChild(container); // Ensure the container is attached to the DOM

    const editor = monaco.editor.create(container, {
      value: code,
      language: 'javascript',
      theme: 'vs-dark',
    });

    // Subscribe to content change events
    editor.onDidChangeModelContent((event) => {
      onValueChange && onValueChange(editor.getValue())
    });

    // Subscribe to cursor position change events
    editor.onDidChangeCursorPosition((event) => {
      onCursorMoved && onCursorMoved(event.position);
    });

    return container;
}