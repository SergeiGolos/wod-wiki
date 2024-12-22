import * as monaco from 'monaco-editor';
import { MdTimerRuntime, MdTimeRuntimeResult} from "./lib/md-timer";

export interface WodWikiProps {  
    /** What background color to use */
    code?: string;
    /** Optional value change handler */
    onValueChange?: (value: MdTimeRuntimeResult) => void;
    /** Optional cursor position handler */
    onCursorMoved?: (position: monaco.Position) => void;
}

/** Primary UI component for user interaction */
export const createWodWiki = ({
    code = "",    
    onValueChange,
    onCursorMoved,
}: WodWikiProps) => {
    
    const container = document.createElement("div");
    container.style.height = '400px';
    container.style.width = '600px';    
    document.body.appendChild(container); // Ensure the container is attached to the DOM

    const editor = monaco.editor.create(container, {
      value: "",
      language: 'javascript',
      theme: 'vs-dark',
    });

    let interpreter = new MdTimerRuntime();
    editor.onDidChangeModelContent((event) => {      
      let model =interpreter.read(editor.getValue());      
      onValueChange && onValueChange(model);
    });

    // Subscribe to cursor position change events
    editor.onDidChangeCursorPosition((event) => {
      onCursorMoved && onCursorMoved(event.position);
    });
    
    editor.setValue(code);
    return container;
}