import * as monaco from 'monaco-editor';
import { MdTimerRuntime} from "./parser/md-timer";

export interface WodWikiProps {  
    /** What background color to use */
    code?: string;
    /** Optional value change handler */
    onValueChange?: (value: any, editor: any) => void;
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
      value: code,
      language: 'javascript',
      theme: 'vs-dark',
    });

    let interpreter = new MdTimerRuntime();
    
    // Debounce function
    function debounce<T extends (...args: any[]) => any>(
      func: T,
      wait: number
    ): (...args: Parameters<T>) => void {
      let timeout: ReturnType<typeof setTimeout>;
      return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    }

    // Debounced handler
    const debouncedUpdate = debounce((content: string) => {
      let model = interpreter.read(content);      
      onValueChange && onValueChange(model, editor);
    }, 600);

    editor.onDidChangeModelContent((event) => {      
      console.log("onDidChangeModelContent", event);
      onValueChange && onValueChange({ outcome: [ { status : "compiling" } ] }, editor);
      debouncedUpdate(editor.getValue());
    });

    // Subscribe to cursor position change events
    editor.onDidChangeCursorPosition((event) => {
      onCursorMoved && onCursorMoved(event.position);
    });
    
    return container;
}