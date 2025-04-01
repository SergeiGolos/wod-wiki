import Editor from '@monaco-editor/react';
import { useEffect } from 'react';
import { WodWikiSyntaxInitializer } from '../hooks/WodWikiSyntaxInitializer';
import { SemantcTokenEngine } from '../hooks/SemantcTokenEngine';
import { SuggestionEngine } from '../hooks/SuggestionEngine';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { DefaultSuggestionService } from '../hooks/SuggestionService';
import { WodRuntimeScript, WodWikiToken } from '@/core/timer.types';

interface WodWikiProps {
  id: string;
  code?: string;  
  /** Optional value change handler */
  onValueChange?: (classObject?: WodRuntimeScript) => void;    
}

const tokens: WodWikiToken[] = [
  { token: "duration", foreground: "FFA500", fontStyle: "bold", hints: [{ hint: '⏱️', position: "before" }] },
  { token: "rep", foreground: "008800", fontStyle: "bold", hints: [{ hint: 'x', position: "after" }] },
  { token: "resistance", foreground: "008800", fontStyle: "bold", hints: [{ hint: '💪', position: "before" }] },
  { token: "distance", foreground: "008800", fontStyle: "bold", hints: []},
  { token: "effort", foreground: "000000", hints: [] },
  { token: "rounds", foreground: "AA8658", hints: [{ hint: ':rounds', position: "after", offSet: -1 }] },
]

export const WodWiki = ({ id, code = "", onValueChange }: WodWikiProps) => {        
    const initializer = new WodWikiSyntaxInitializer(new SemantcTokenEngine(tokens), new SuggestionEngine(new DefaultSuggestionService()), onValueChange);      
    function handleMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
      initializer.handleMount(editor, monaco);
    }
    function handleBeforeMount(monaco: Monaco) {
      initializer.handleBeforeMount(monaco);
    }
    function handleEditorValidation(markers: editor.IMarker[]) {
      // model markers
      markers.forEach((marker) => console.log('onValidate:', marker.message));
    }
        
  useEffect(() => {
    // This code runs when the component mounts (first render)
    // Return a cleanup function
    return () => {
      initializer.handleUnmount();
      // This code runs when the component unmounts
      // - Remove event listeners
    };
  }, []); // The empty dependency array ensures this runs only once on mount and unmount


  // TODO: uncomment when cursorMovedHandler is implemented
  // function cursorMovedHandler(
  //   editor: editor.IStandaloneCodeEditor,
  //   event: editor.ICursorPositionChangedEvent,
  //   classObject?: WodRuntimeScript | undefined
  // ): void {
  //   console.log("Cursor moved: ", event);
  // }


    return (
      <Editor
        height="30vh"    
        path={id}
        language={initializer.syntax} 
        theme={initializer.theme}        
        defaultValue={code}
        beforeMount={handleBeforeMount}      
        onMount={handleMount}     
        onValidate={handleEditorValidation}   
        options={initializer.options}        
    />
    )
  };   
